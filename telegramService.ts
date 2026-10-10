import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { searchBooruMedia } from "./booruSearch";

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

interface UserSession {
  nsfw: boolean;
  gif: boolean;
  lastQuery?: string;
  lastPosts?: any[];
  currentIndex?: number;
}

const CONFIG_FILE = path.join(process.cwd(), ".telegram_config.json");

function escapeHtml(str: any): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

class TelegramBotManager {
  private token: string | null = null;
  private botInfo: TelegramBotInfo | null = null;
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;
  private lastError: string | null = null;
  private startedAt: string | null = null;
  private nsfwDefault: boolean = true;
  private logs: TelegramLog[] = [];
  private userSessions: Map<number, UserSession> = new Map();
  private stats = {
    messagesProcessed: 0,
    searchesPerformed: 0,
    mediaSent: 0,
    activeUsers: 0
  };

  constructor() {
    this.loadSavedConfig();
  }

  public addLog(level: "info" | "success" | "warn" | "error", message: string) {
    const log: TelegramLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    this.logs.push(log);
    if (this.logs.length > 100) this.logs.shift();
    console.log(`[TelegramBot ${level.toUpperCase()}] ${message}`);
  }

  private loadSavedConfig() {
    try {
      if (process.env.TELEGRAM_BOT_TOKEN) {
        this.token = process.env.TELEGRAM_BOT_TOKEN.trim();
        this.addLog("info", "Found TELEGRAM_BOT_TOKEN in environment variables");
      } else if (fs.existsSync(CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
        if (data.token) {
          this.token = data.token.trim();
          this.nsfwDefault = data.nsfwDefault !== undefined ? !!data.nsfwDefault : true;
          this.addLog("info", "Loaded saved Telegram Bot configuration");
        }
      }
    } catch (e: any) {
      this.addLog("warn", `Could not read saved config: ${e.message}`);
    }
  }

  private saveConfig() {
    try {
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(
          {
            token: this.token,
            nsfwDefault: this.nsfwDefault
          },
          null,
          2
        )
      );
    } catch (e: any) {
      this.addLog("warn", `Failed to save configuration to disk: ${e.message}`);
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      botInfo: this.botInfo,
      tokenMasked: this.token
        ? `${this.token.substring(0, 4)}••••••••:${this.token.substring(this.token.length - 4)}`
        : null,
      hasToken: !!this.token,
      startedAt: this.startedAt,
      lastError: this.lastError,
      nsfwDefault: this.nsfwDefault,
      stats: {
        ...this.stats,
        activeUsers: this.userSessions.size
      }
    };
  }

  public getLogs() {
    return this.logs;
  }

  public async start(providedToken?: string, nsfwDefault?: boolean) {
    if (providedToken) {
      this.token = providedToken.trim();
    }
    if (nsfwDefault !== undefined) {
      this.nsfwDefault = nsfwDefault;
    }

    if (!this.token) {
      throw new Error("Bot token is required. Please obtain one from @BotFather.");
    }

    // Stop existing loop if running
    await this.stop();

    this.addLog("info", "Authenticating Telegram bot token with Telegram API...");

    try {
      // 1. Test getMe
      const meRes = await axios.get(`https://api.telegram.org/bot${this.token}/getMe`, { timeout: 10000 });
      if (!meRes.data.ok) {
        throw new Error(meRes.data.description || "Invalid bot token");
      }

      this.botInfo = meRes.data.result;
      this.lastError = null;
      this.startedAt = new Date().toISOString();
      this.saveConfig();

      this.addLog("success", `Bot connected as @${this.botInfo?.username} (${this.botInfo?.first_name})`);

      // 2. Clear any webhook to enable long polling
      await axios.get(`https://api.telegram.org/bot${this.token}/deleteWebhook?drop_pending_updates=true`, { timeout: 10000 }).catch(() => {});

      // 3. Register commands menu in Telegram
      await this.registerCommands();

      // 4. Start polling loop
      this.isRunning = true;
      this.abortController = new AbortController();
      this.pollUpdates(this.abortController.signal);

      return this.getStatus();
    } catch (err: any) {
      const msg = err.response?.data?.description || err.message || "Failed to connect to Telegram API";
      this.lastError = msg;
      this.isRunning = false;
      this.addLog("error", `Connection failed: ${msg}`);
      throw new Error(msg);
    }
  }

  public async stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRunning = false;
    this.startedAt = null;
    this.addLog("info", "Telegram Bot stopped");
  }

  public async disconnect() {
    await this.stop();
    this.token = null;
    this.botInfo = null;
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        fs.unlinkSync(CONFIG_FILE);
      }
    } catch {}
    this.addLog("info", "Telegram Bot token removed");
    return this.getStatus();
  }

  public updateSettings(settings: { nsfwDefault?: boolean }) {
    if (settings.nsfwDefault !== undefined) {
      this.nsfwDefault = !!settings.nsfwDefault;
      this.saveConfig();
      this.addLog("info", `Updated default NSFW mode: ${this.nsfwDefault ? "Enabled" : "Safe"}`);
    }
    return this.getStatus();
  }

  private async registerCommands() {
    if (!this.token) return;
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/setMyCommands`, {
        commands: [
          { command: "start", description: "🚀 Open main menu & controls" },
          { command: "image", description: "🖼️ Search HD images (e.g. /image neko)" },
          { command: "video", description: "🎬 Search HQ videos & clips (e.g. /video oppai)" },
          { command: "search", description: "🔍 Search all art by tags" },
          { command: "random", description: "🎲 Random top-rated artwork" },
          { command: "gif", description: "🎞️ Short animated GIF loops" },
          { command: "tags", description: "🏷️ Browse 18+ & anime tags" },
          { command: "help", description: "ℹ️ Help and usage guide" }
        ]
      });
      this.addLog("info", "Bot commands registered successfully with Telegram");
    } catch (e: any) {
      this.addLog("warn", `Failed to set bot commands: ${e.message}`);
    }
  }

  private async pollUpdates(signal: AbortSignal) {
    let offset = 0;
    this.addLog("info", "Started Telegram long-polling update loop");

    while (this.isRunning && !signal.aborted) {
      try {
        const response = await axios.get(`https://api.telegram.org/bot${this.token}/getUpdates`, {
          params: {
            offset: offset,
            timeout: 20,
            allowed_updates: ["message", "callback_query", "inline_query"]
          },
          timeout: 30000,
          signal
        });

        if (response.data && response.data.ok && Array.isArray(response.data.result)) {
          const updates = response.data.result;
          for (const update of updates) {
            offset = update.update_id + 1;
            this.handleUpdate(update).catch(err => {
              this.addLog("error", `Error processing update ${update.update_id}: ${err.message}`);
            });
          }
        }
      } catch (err: any) {
        if (signal.aborted || axios.isCancel(err)) {
          break;
        }
        // If network glitch or 409 conflict, back off slightly
        const status = err.response?.status;
        if (status === 409) {
          this.addLog("warn", "Conflict: Another instance of this bot might be polling. Waiting 5s...");
          await new Promise(r => setTimeout(r, 5000));
        } else if (status === 401 || status === 404) {
          this.addLog("error", "Bot token revoked or invalid. Halting bot.");
          this.stop();
          break;
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
  }

  private getUserSession(chatId: number): UserSession {
    if (!this.userSessions.has(chatId)) {
      this.userSessions.set(chatId, {
        nsfw: true,
        gif: false
      });
    }
    const session = this.userSessions.get(chatId)!;
    session.nsfw = true;
    return session;
  }

  private async handleUpdate(update: any) {
    this.stats.messagesProcessed++;

    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    } else if (update.inline_query) {
      await this.handleInlineQuery(update.inline_query);
    }
  }

  private async handleMessage(msg: any) {
    const chatId = msg.chat?.id;
    if (!chatId) return;

    const text = (msg.text || "").trim();
    const user = msg.from;
    const session = this.getUserSession(chatId);

    this.addLog("info", `Message from @${user?.username || user?.first_name || chatId}: "${text.slice(0, 40)}"`);

    // Handle commands
    if (text.startsWith("/")) {
      const [cmdWithBot, ...argsArr] = text.split(/\s+/);
      const cmd = cmdWithBot.split("@")[0].toLowerCase();
      const query = argsArr.join(" ");

      switch (cmd) {
        case "/start":
          await this.sendWelcomeMessage(chatId, user);
          return;

        case "/help":
          await this.sendHelpMessage(chatId);
          return;

        case "/nsfw":
        case "/safe":
          session.nsfw = true;
          await this.sendMessage(chatId, `🔞 *OCTΛGRΛM Bot Rating Mode*\n\nTelegram bot is permanently configured in *NSFW / Unrestricted (18+ Default)* mode. Safe Mode is disabled on Telegram.\n\nAll searches, random rolls, and GIFs deliver full uncensored media!`, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎲 Roll Random Art", callback_data: "random" }],
                [{ text: "🏷️ Explore 18+ & Anime Tags", callback_data: "show_tags" }]
              ]
            }
          });
          return;

        case "/image":
        case "/img":
        case "/photo":
        case "/pic":
          await this.performSearch(chatId, query || "waifu", { gifOnly: false });
          return;

        case "/video":
        case "/vid":
        case "/mp4":
        case "/webm":
        case "/gif":
          await this.performSearch(chatId, query || "waifu", { gifOnly: true });
          return;

        case "/random":
        case "/roll":
          await this.sendRandomMedia(chatId);
          return;

        case "/tags":
        case "/categories":
          await this.sendTagsMenu(chatId);
          return;

        case "/search":
          if (!query) {
            await this.sendMessage(chatId, "🔍 *Please provide tags to search!*\n\nExamples:\n• `/image neko` (HD Photo)\n• `/video oppai` (HQ Video)\n• `/search waifu` (All Media)", {
              parse_mode: "Markdown"
            });
            return;
          }
          await this.performSearch(chatId, query);
          return;

        default:
          await this.sendMessage(chatId, "❓ Unknown command. Type /help to see all available commands, or use buttons below:", {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🖼️ Image Search", callback_data: "mode_image" },
                  { text: "🎬 Video Search", callback_data: "mode_video" }
                ],
                [
                  { text: "🎲 Random Art", callback_data: "random" },
                  { text: "🏷️ Tags", callback_data: "show_tags" }
                ]
              ]
            }
          });
          return;
      }
    }

    // Direct plain text: treat as instant search query!
    if (text) {
      await this.performSearch(chatId, text);
    }
  }

  private async sendWelcomeMessage(chatId: number, user: any) {
    const greeting = user?.first_name ? `Hey *${user.first_name}*!` : "Hello!";

    const text = `🌸 ${greeting}\nWelcome to *OCTΛGRΛM Anime & Media Vault*!\n\n` +
      `🔥 Search across 9+ Booru engines (Danbooru, Gelbooru, Yande.re, Rule34, Xbooru, Realbooru & more) directly in Telegram!\n\n` +
      `🔞 *Default Mode: NSFW / Unrestricted (18+ Active)*\n` +
      `_Safe Mode is disabled on Telegram; full uncensored media is delivered._\n\n` +
      `🎬 *High Quality Video & Image Options:*\n` +
      `• Choose between 🖼️ *HD Images* and 🎬 *HQ Videos / MP4*\n` +
      `• Tap any quick action button below or send any tag directly!`;

    const reply_markup = {
      inline_keyboard: [
        [
          { text: "🖼️ HD Images", callback_data: "mode_image" },
          { text: "🎬 HQ Videos & MP4", callback_data: "mode_video" }
        ],
        [
          { text: "🎲 Random Art", callback_data: "random" },
          { text: "🎞️ Short GIFs", callback_data: "search_gif" }
        ],
        [
          { text: "🏷️ 18+ & Anime Tags", callback_data: "show_tags" },
          { text: "🔥 Spicy Search", callback_data: "search:hentai" }
        ],
        [
          { text: "🔍 Search Oppai", callback_data: "search:oppai" },
          { text: "🔍 Search Waifu", callback_data: "search:waifu" }
        ],
        [
          { text: "ℹ️ Help & Commands", callback_data: "help" }
        ]
      ]
    };

    await this.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup });
  }

  private async sendHelpMessage(chatId: number) {
    const text = `📖 *OCTΛGRΛM Telegram Bot Guide*\n\n` +
      `*Media Commands:*\n` +
      `• \`/image <tag>\` - Search HD anime images only (e.g. \`/image neko\`)\n` +
      `• \`/video <tag>\` - Search HQ video clips & MP4s (e.g. \`/video waifu\`)\n` +
      `• \`/search <tag>\` - Search all media across 9+ sources\n` +
      `• \`/random\` - Deliver a top-rated random artwork\n` +
      `• \`/gif [tag]\` - Search animated loops & short animations\n` +
      `• \`/tags\` - View popular 18+ & anime categories\n` +
      `• \`/help\` - Show this message\n\n` +
      `🔞 *Rating Policy:*\n` +
      `Safe Mode is disabled on Telegram. All media is fetched in Unrestricted / NSFW (18+) mode by default.\n\n` +
      `🎬 *High Quality Videos:*\n` +
      `Videos are sourced directly from Danbooru, Gelbooru & Xbooru and auto-optimized/streamed in Telegram video format.\n\n` +
      `💡 *Pro Tips:*\n` +
      `1. You can toggle between 🖼️ Image and 🎬 Video right under each post!\n` +
      `2. Just type any word like \`oppai\`, \`genshin\`, \`waifu\` for instant results.\n` +
      `3. Inline query: type \`@${this.botInfo?.username || "bot"} <tags>\` to send art in any chat!\n` +
      `4. Use the *Next* button under any image/video to browse through search results.`;

    await this.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎲 Try Random Now", callback_data: "random" }],
          [{ text: "🏷️ Explore Tags", callback_data: "show_tags" }]
        ]
      }
    });
  }

  private async sendTagsMenu(chatId: number) {
    const tags = [
      ["waifu", "oppai"],
      ["hentai", "ecchi"],
      ["neko", "milf"],
      ["kitsune", "maid"],
      ["pussy", "cum"],
      ["feet", "pov"],
      ["genshin_impact", "yuri"],
      ["bdsm", "aesthetic"]
    ];

    const inline_keyboard = tags.map(row =>
      row.map(tag => ({
        text: `🏷️ ${tag}`,
        callback_data: `search:${tag}`
      }))
    );

    inline_keyboard.push([{ text: "🎲 Random Discovery", callback_data: "random" }]);

    await this.sendMessage(chatId, "✨ *Select a popular 18+ / anime category to search:*", {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard }
    });
  }

  private async performSearch(chatId: number, query: string, options: { gifOnly?: boolean; page?: number } = {}) {
    const session = this.getUserSession(chatId);
    this.stats.searchesPerformed++;

    await this.sendChatAction(chatId, options.gifOnly ? "upload_video" : "upload_photo");

    try {
      this.addLog("info", `Searching query="${query}" nsfw=${session.nsfw} gif=${options.gifOnly || false}`);
      const result = await searchBooruMedia({
        query,
        nsfw: session.nsfw,
        page: options.page || 1,
        per_page: 60,
        gif: options.gifOnly || false
      });

      if (!result.posts || result.posts.length === 0) {
        await this.sendMessage(
          chatId,
          `😿 *No media found for:* \`${query}\`\n\n` +
          `Try broader tags like \`waifu\`, \`neko\`, \`oppai\`, or \`ecchi\`.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🏷️ Browse Categories", callback_data: "show_tags" }],
                [{ text: "🎲 Try Random", callback_data: "random" }]
              ]
            }
          }
        );
        return;
      }

      session.lastQuery = query;
      session.lastPosts = result.posts;
      session.currentIndex = 0;
      session.gif = options.gifOnly || false;

      await this.sendMediaPost(chatId, result.posts[0], 0, result.posts.length, query);
    } catch (e: any) {
      this.addLog("error", `Search failed: ${e.message}`);
      await this.sendMessage(chatId, `⚠️ Search failed: ${e.message || "Unknown error"}. Please try again later.`);
    }
  }

  private async sendRandomMedia(chatId: number) {
    const popularTags = [
      "waifu", "oppai", "hentai", "ecchi", "neko", 
      "milf", "kitsune", "maid", "aesthetic", "masterpiece"
    ];
    const randomTag = popularTags[Math.floor(Math.random() * popularTags.length)];
    await this.performSearch(chatId, randomTag);
  }

  private async sendMediaPost(chatId: number, post: any, index: number, total: number, query: string) {
    const session = this.getUserSession(chatId);

    // Helpers to detect animation/video file extensions
    const isAnimExtension = (u?: string) => Boolean(u && /\.(mp4|webm|gif)(\?|$)/i.test(u));

    const isVideo =
      Boolean(session.gif) ||
      Boolean(post.is_animated) ||
      Boolean(post.is_video) ||
      isAnimExtension(post.file_url) ||
      isAnimExtension(post.sample_url);

    // Never pick a static .jpg thumbnail when video or gif is requested!
    let mediaUrl: string;
    if (isVideo) {
      if (isAnimExtension(post.file_url)) {
        mediaUrl = post.file_url;
      } else if (isAnimExtension(post.sample_url)) {
        mediaUrl = post.sample_url;
      } else {
        mediaUrl = post.file_url || post.sample_url || post.preview_url;
      }
    } else {
      mediaUrl = post.sample_url || post.file_url || post.preview_url;
    }

    if (!mediaUrl) return;
    this.stats.mediaSent++;

    // Format clean caption tags
    const rawTags = (post.tags || "").split(/\s+/).filter(Boolean);
    const cleanTags = rawTags.slice(0, 8).map((t: string) => `#${t.replace(/[^a-zA-Z0-9_]/g, "")}`).join(" ");

    const score = post.score || 0;
    const ratingLabel = post.rating === "e" ? "🔞 Explicit" : post.rating === "q" ? "⚠️ Questionable" : "🛡️ General";
    const sourceLabel = post.source || "Booru";

    const caption = `✨ <b>${escapeHtml(query.toUpperCase())}</b> (${index + 1}/${total})\n\n` +
      `🏷️ <code>${escapeHtml(cleanTags)}</code>\n\n` +
      `⭐ Score: <b>${score}</b> | ${ratingLabel}\n` +
      `🌐 Source: <code>${escapeHtml(sourceLabel)}</code>`;

    const inline_keyboard: any[][] = [];

    // Row 1: Next / Prev buttons
    const navRow: any[] = [];
    if (index > 0) {
      navRow.push({ text: "⬅️ Prev", callback_data: `nav:${index - 1}` });
    }
    if (index < total - 1) {
      navRow.push({ text: "🔄 Next ➡️", callback_data: `nav:${index + 1}` });
    } else {
      navRow.push({ text: "🔄 More", callback_data: `nav:0` });
    }
    inline_keyboard.push(navRow);

    // Row 2: Media Type Switch & Random
    const currentIsVideo = !!session.gif || isVideo;
    inline_keyboard.push([
      { 
        text: currentIsVideo ? "🖼️ Switch to Images" : "🎬 Switch to Videos", 
        callback_data: currentIsVideo ? `switch_mode:img:${escape(query)}` : `switch_mode:vid:${escape(query)}` 
      },
      { text: "🎲 Random", callback_data: "random" }
    ]);

    // Row 3: HD Download & Tags
    inline_keyboard.push([
      { text: "📥 Full HD Original", url: post.file_url || mediaUrl },
      { text: "🏷️ Tags", callback_data: "show_tags" }
    ]);

    const reply_markup = { inline_keyboard };

    // For videos and animations, if the URL is an MP4, try URL sending first.
    // For GIFs or WEBMs, or if URL send fails, download and convert with ffmpeg to prevent frozen frames.
    let sent = false;

    if (isVideo) {
      const isDirectMp4 = mediaUrl.toLowerCase().endsWith(".mp4");
      if (isDirectMp4) {
        try {
          await this.sendAnimationOrVideo(chatId, mediaUrl, caption, reply_markup);
          sent = true;
        } catch (err: any) {
          this.addLog("warn", `Direct MP4 URL send failed: ${err.message}. Trying buffer fallback...`);
        }
      }

      if (!sent) {
        // Buffer fallback with ffmpeg transcoding: guaranteed smooth non-freezing playback!
        try {
          await this.sendMediaAsBuffer(chatId, mediaUrl, true, caption, reply_markup);
          sent = true;
        } catch (bufErr: any) {
          this.addLog("error", `Video buffer send failed: ${bufErr.response?.data?.description || bufErr.message}`);
        }
      }
    } else {
      // Standard image sending
      const urlsToTry = [mediaUrl];
      if (post.file_url && post.file_url !== mediaUrl) urlsToTry.push(post.file_url);
      if (post.preview_url && !urlsToTry.includes(post.preview_url)) urlsToTry.push(post.preview_url);

      for (const url of urlsToTry) {
        try {
          await this.sendPhotoWithFallback(chatId, url, caption, reply_markup);
          sent = true;
          break;
        } catch (err: any) {
          this.addLog("warn", `Photo send for URL ${url.slice(0, 40)}... failed: ${err.response?.data?.description || err.message}`);
        }
      }

      if (!sent) {
        try {
          await this.sendMediaAsBuffer(chatId, mediaUrl, false, caption, reply_markup);
          sent = true;
        } catch (bufErr: any) {
          this.addLog("error", `Photo buffer send failed: ${bufErr.response?.data?.description || bufErr.message}`);
        }
      }
    }

    if (!sent) {
      // Ultimate fallback: formatted HTML card with direct clickable media link
      const fallbackText = `${caption}\n\n${isVideo ? "🎬" : "🖼️"} <a href="${post.file_url || mediaUrl}">Click here to open ${isVideo ? "HQ Video" : "HD Image"}</a>`;
      await this.sendMessage(chatId, fallbackText, {
        parse_mode: "HTML",
        reply_markup
      });
    }
  }

  private async sendPhotoWithFallback(chatId: number, url: string, caption: string, reply_markup: any) {
    if (!this.token) return;
    await axios.post(`https://api.telegram.org/bot${this.token}/sendPhoto`, {
      chat_id: chatId,
      photo: url,
      caption: caption,
      parse_mode: "HTML",
      reply_markup
    }, { timeout: 15000 });
  }

  private async sendAnimationOrVideo(chatId: number, url: string, caption: string, reply_markup: any) {
    if (!this.token) return;
    // Telegram sendAnimation plays MP4 and GIFs as an autoplaying, seamlessly looping animation
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendAnimation`, {
        chat_id: chatId,
        animation: url,
        caption: caption,
        parse_mode: "HTML",
        reply_markup
      }, { timeout: 20000 });
    } catch {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendVideo`, {
        chat_id: chatId,
        video: url,
        caption: caption,
        parse_mode: "HTML",
        supports_streaming: true,
        reply_markup
      }, { timeout: 20000 });
    }
  }

  private async sendMediaAsBuffer(chatId: number, url: string, isVideo: boolean, caption: string, reply_markup: any) {
    if (!this.token) return;

    let referer = "https://yande.re/";
    if (url.includes("danbooru")) referer = "https://danbooru.donmai.us/";
    if (url.includes("gelbooru")) referer = "https://gelbooru.com/";
    if (url.includes("konachan")) referer = "https://konachan.com/";
    if (url.includes("rule34")) referer = "https://rule34.xxx/";
    if (url.includes("xbooru")) referer = "https://xbooru.com/";
    if (url.includes("realbooru")) referer = "https://realbooru.com/";

    const res = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": referer
      },
      timeout: 30000
    });

    let buffer = Buffer.from(res.data);
    let contentType = String(res.headers["content-type"] || (isVideo ? "video/mp4" : "image/jpeg"));
    let filename = path.basename(new URL(url).pathname) || (isVideo ? "video.mp4" : "image.jpg");

    // Transcode WEBM or GIF into high-efficiency, non-freezing H.264 MP4 with ffmpeg!
    // Using ultrafast preset, yuv420p color space, even-dimension scaling, and faststart headers.
    const isGifOrWebm = filename.endsWith(".webm") || filename.endsWith(".gif") || contentType.includes("webm") || contentType.includes("gif");
    if (isVideo && isGifOrWebm) {
      const tempId = Math.random().toString(36).substring(2, 9);
      const ext = filename.endsWith(".gif") || contentType.includes("gif") ? "gif" : "webm";
      const tempIn = path.join(os.tmpdir(), `tg_in_${tempId}.${ext}`);
      const tempOut = path.join(os.tmpdir(), `tg_out_${tempId}.mp4`);
      try {
        fs.writeFileSync(tempIn, buffer);
        execSync(`ffmpeg -y -i "${tempIn}" -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -movflags +faststart -t 45 "${tempOut}"`, {
          timeout: 30000,
          stdio: "ignore"
        });
        if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 0) {
          buffer = fs.readFileSync(tempOut);
          contentType = "video/mp4";
          filename = `${tempId}.mp4`;
        }
      } catch (convErr: any) {
        this.addLog("warn", `Video/GIF conversion note: ${convErr.message}`);
      } finally {
        try { if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn); } catch {}
        try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch {}
      }
    }

    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");
    if (reply_markup) {
      formData.append("reply_markup", JSON.stringify(reply_markup));
    }

    const blob = new Blob([buffer], { type: contentType });

    if (isVideo) {
      // In Telegram Bot API, sending an MP4 as 'animation' renders it as a smooth, autoplaying, looping GIF
      // sending as 'video' renders it with playback controls.
      formData.append("animation", blob, filename);
      try {
        await axios.post(`https://api.telegram.org/bot${this.token}/sendAnimation`, formData, {
          timeout: 45000
        });
      } catch {
        const videoForm = new FormData();
        videoForm.append("chat_id", String(chatId));
        videoForm.append("caption", caption);
        videoForm.append("parse_mode", "HTML");
        if (reply_markup) videoForm.append("reply_markup", JSON.stringify(reply_markup));
        videoForm.append("video", blob, filename);
        await axios.post(`https://api.telegram.org/bot${this.token}/sendVideo`, videoForm, {
          timeout: 45000
        });
      }
    } else {
      formData.append("photo", blob, filename);
      await axios.post(`https://api.telegram.org/bot${this.token}/sendPhoto`, formData, {
        timeout: 30000
      });
    }
  }

  private async handleCallbackQuery(cq: any) {
    const cqId = cq.id;
    const data = cq.data || "";
    const chatId = cq.message?.chat?.id;
    if (!chatId) return;

    const session = this.getUserSession(chatId);

    // Answer callback query to stop loading spinner on user client
    await axios.post(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`, {
      callback_query_id: cqId
    }).catch(() => {});

    if (data === "random") {
      await this.sendRandomMedia(chatId);
    } else if (data === "show_tags") {
      await this.sendTagsMenu(chatId);
    } else if (data === "help") {
      await this.sendHelpMessage(chatId);
    } else if (data === "mode_image") {
      session.gif = false;
      await this.sendMessage(chatId, `🖼️ *Image Mode Active*\nSend any tag or use buttons to search high-resolution anime images! (e.g. \`/image neko\`)`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔍 Search Waifu Images", callback_data: "search:waifu" }],
            [{ text: "🔍 Search Oppai Images", callback_data: "search:oppai" }],
            [{ text: "🎬 Switch to Videos", callback_data: "mode_video" }]
          ]
        }
      });
    } else if (data === "mode_video") {
      session.gif = true;
      await this.sendMessage(chatId, `🎬 *HQ Video & Animation Mode Active*\nSearching top-rated animated clips & MP4s! (e.g. \`/video oppai\`)`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎬 Video: Waifu", callback_data: "switch_mode:vid:waifu" }],
            [{ text: "🎬 Video: Oppai", callback_data: "switch_mode:vid:oppai" }],
            [{ text: "🎬 Video: Hentai", callback_data: "switch_mode:vid:hentai" }],
            [{ text: "🖼️ Switch to Images", callback_data: "mode_image" }]
          ]
        }
      });
    } else if (data === "search_gif") {
      await this.performSearch(chatId, "waifu", { gifOnly: true });
    } else if (data.startsWith("switch_mode:")) {
      const parts = data.split(":");
      const targetMode = parts[1]; // 'img' or 'vid'
      const rawQuery = unescape(parts.slice(2).join(":") || "waifu");
      const isVid = targetMode === "vid";
      session.gif = isVid;
      await this.performSearch(chatId, rawQuery || "waifu", { gifOnly: isVid });
    } else if (data === "toggle_nsfw") {
      session.nsfw = true;
      await this.sendMessage(chatId, `🔞 *OCTΛGRΛM Telegram Bot is configured in permanent Unrestricted / NSFW (18+) mode.* Safe Mode is disabled on Telegram.`);
    } else if (data.startsWith("search:")) {
      const tag = data.replace("search:", "");
      await this.performSearch(chatId, tag, { gifOnly: session.gif });
    } else if (data.startsWith("nav:")) {
      const nextIndex = parseInt(data.replace("nav:", ""), 10);
      if (session.lastPosts && session.lastPosts[nextIndex]) {
        session.currentIndex = nextIndex;
        await this.sendMediaPost(
          chatId,
          session.lastPosts[nextIndex],
          nextIndex,
          session.lastPosts.length,
          session.lastQuery || "art"
        );
      } else {
        await this.sendRandomMedia(chatId);
      }
    }
  }

  private async handleInlineQuery(iq: any) {
    const iqId = iq.id;
    const query = (iq.query || "").trim() || "waifu";

    try {
      const results = await searchBooruMedia({
        query,
        nsfw: true,
        page: 1,
        per_page: 20
      });

      const inlineResults = (results.posts || []).slice(0, 20).map((post: any, i: number) => ({
        type: "photo",
        id: `${post.id}_${i}`,
        photo_url: post.sample_url || post.file_url,
        thumb_url: post.preview_url || post.sample_url || post.file_url,
        title: (post.tags || query).slice(0, 30),
        description: `Score: ${post.score || 0} | Source: ${post.source || "Booru"}`,
        caption: `🌸 <b>${escapeHtml(query)}</b>\n⭐ Score: ${post.score || 0}\n🔗 <a href="${post.file_url || post.sample_url}">Original File</a>`,
        parse_mode: "HTML"
      }));

      await axios.post(`https://api.telegram.org/bot${this.token}/answerInlineQuery`, {
        inline_query_id: iqId,
        results: inlineResults,
        cache_time: 300
      });
    } catch (e: any) {
      this.addLog("warn", `Inline query failed: ${e.message}`);
    }
  }

  private async sendMessage(chatId: number, text: string, extra: any = {}) {
    if (!this.token) return;
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        chat_id: chatId,
        text,
        ...extra
      }, { timeout: 10000 });
    } catch (e: any) {
      this.addLog("error", `Failed to sendMessage to ${chatId}: ${e.message}`);
    }
  }

  private async sendChatAction(chatId: number, action: string) {
    if (!this.token) return;
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendChatAction`, {
        chat_id: chatId,
        action
      }, { timeout: 5000 });
    } catch {}
  }
}

export const telegramBotManager = new TelegramBotManager();
