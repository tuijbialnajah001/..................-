import express from "express";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { searchBooruMedia } from "./booruSearch";
import { telegramBotManager } from "./telegramService";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Proxy for Media Search
app.get("/api/search", async (req, res) => {
  const { query, nsfw = "false", page = 1, per_page = 200, gif = "false" } = req.query;

  try {
    const result = await searchBooruMedia({
      query: String(query || ''),
      nsfw: String(nsfw),
      page: Number(page) || 1,
      per_page: Number(per_page) || 200,
      gif: String(gif)
    });
    res.json(result);
  } catch (error: any) {
    console.error("Search API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch media artifacts" });
  }
});

// Telegram Bot Management Endpoints
app.get("/api/telegram/status", (req, res) => {
  try {
    const status = telegramBotManager.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/telegram/logs", (req, res) => {
  try {
    const logs = telegramBotManager.getLogs();
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/telegram/connect", async (req, res) => {
  const { token, nsfwDefault } = req.body;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Telegram Bot Token is required." });
  }

  try {
    const status = await telegramBotManager.start(token.trim(), nsfwDefault);
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to start Telegram Bot" });
  }
});

app.post("/api/telegram/disconnect", async (req, res) => {
  try {
    const status = await telegramBotManager.disconnect();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/telegram/settings", (req, res) => {
  try {
    const status = telegramBotManager.updateSettings(req.body);
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy to fetch media as blob (to avoid CORS in frontend when zipping or rendering)
app.all("/api/proxy-media", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") return res.status(400).send("URL required");

  try {
    let referer = 'https://yande.re/';
    if (url.includes('danbooru')) referer = 'https://danbooru.donmai.us/';
    if (url.includes('konachan')) referer = 'https://konachan.com/';
    if (url.includes('gelbooru')) referer = 'https://gelbooru.com/';
    if (url.includes('safebooru')) referer = 'https://safebooru.org/';
    if (url.includes('rule34')) referer = 'https://rule34.xxx/';
    if (url.includes('xbooru')) referer = 'https://xbooru.com/';
    if (url.includes('tbib')) referer = 'https://tbib.org/';

    const reqHeaders: any = {
      'User-Agent': 'AnimeVault/1.0',
      'Referer': referer
    };
    
    if (req.headers.range) {
      reqHeaders['Range'] = req.headers.range;
    }

    const response = await axios({
      method: req.method,
      url: url,
      responseType: req.method === 'HEAD' ? "text" : "stream",
      headers: reqHeaders,
      validateStatus: () => true
    });

    if (response.status >= 400) {
      return res.status(response.status).send(`Failed to fetch media: ${response.statusText}`);
    }

    const contentType = response.headers ? response.headers["content-type"] : null;
    if (contentType && String(contentType).includes("text/html")) {
      return res.status(403).send("Received HTML instead of image (Hotlink protection / Cloudflare challenge)");
    }
    
    const contentLength = response.headers ? response.headers["content-length"] : null;
    if (contentType) res.setHeader("Content-Type", String(contentType));
    if (contentLength) res.setHeader("Content-Length", String(contentLength));
    
    if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
    if (response.headers['accept-ranges']) res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
    
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours
    res.status(response.status);
    
    if (req.method === 'HEAD') {
      res.end();
    } else {
      response.data.pipe(res);
    }
  } catch (error) {
    res.status(500).send("Failed to proxy media");
  }
});

async function startServer() {
  // Automatically start Telegram Bot if token was previously saved or set in env
  telegramBotManager.start().catch((err) => {
    // Non-fatal if no token configured yet
    console.log("[TelegramBot] Initial check:", err.message);
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
