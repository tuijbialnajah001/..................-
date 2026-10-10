import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Power, 
  PowerOff, 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  HelpCircle, 
  Copy, 
  Sparkles, 
  Bot, 
  Radio, 
  MessageSquare, 
  Search, 
  Film, 
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';

interface BotInfo {
  id: number;
  first_name: string;
  username: string;
}

interface BotStatus {
  isRunning: boolean;
  botInfo: BotInfo | null;
  tokenMasked: string | null;
  hasToken: boolean;
  startedAt: string | null;
  lastError: string | null;
  nsfwDefault: boolean;
  stats: {
    messagesProcessed: number;
    searchesPerformed: number;
    mediaSent: number;
    activeUsers: number;
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface TelegramBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: BotStatus) => void;
}

export const TelegramBotModal: React.FC<TelegramBotModalProps> = ({ isOpen, onClose, onStatusChange }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'features' | 'logs'>('config');

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/telegram/status');
      setStatus(res.data);
      if (onStatusChange) onStatusChange(res.data);
    } catch {
      // Ignored
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/api/telegram/logs');
      setLogs(res.data.logs || []);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchLogs();
      const interval = setInterval(() => {
        fetchStatus();
        fetchLogs();
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() && !status?.hasToken) {
      setActionError('Please enter your Telegram Bot Token from @BotFather.');
      return;
    }

    setIsLoading(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const res = await axios.post('/api/telegram/connect', {
        token: tokenInput.trim() || undefined,
        nsfwDefault: status?.nsfwDefault ?? true
      });
      setStatus(res.data.status);
      if (onStatusChange) onStatusChange(res.data.status);
      setSuccessMessage(`Connected successfully to @${res.data.status.botInfo?.username}!`);
      setTokenInput('');
      fetchLogs();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to connect bot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Telegram bot?')) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await axios.post('/api/telegram/disconnect');
      setStatus(res.data.status);
      if (onStatusChange) onStatusChange(res.data.status);
      setSuccessMessage('Telegram bot disconnected.');
      fetchLogs();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNsfw = async () => {
    if (!status) return;
    const newNsfw = !status.nsfwDefault;
    try {
      const res = await axios.post('/api/telegram/settings', { nsfwDefault: newNsfw });
      setStatus(res.data.status);
      if (onStatusChange) onStatusChange(res.data.status);
    } catch {
      // Ignored
    }
  };

  const copyBotLink = () => {
    if (!status?.botInfo?.username) return;
    navigator.clipboard.writeText(`https://t.me/${status.botInfo.username}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#229ED9] shadow-inner">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Telegram Bot Integration</h2>
                {status?.isRunning ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/50 border border-white/10">
                    Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">Run OCTΛGRΛM media search & discovery directly on Telegram</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-zinc-900/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'config'
                ? 'border-[#229ED9] text-[#229ED9]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> Bot Setup & Status
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'features'
                ? 'border-[#229ED9] text-[#229ED9]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Bot Commands & Guide
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'logs'
                ? 'border-[#229ED9] text-[#229ED9]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Live Logs ({logs.length})
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {actionError}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" /> {successMessage}
            </div>
          )}

          {/* TAB 1: Config & Status */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Connected Active Card */}
              {status?.isRunning && status.botInfo ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#229ED9]/10 via-zinc-900 to-zinc-900 border border-[#229ED9]/30 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#229ED9] flex items-center justify-center text-white shadow-lg shadow-[#229ED9]/25 font-bold text-lg">
                        🤖
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">{status.botInfo.first_name}</h3>
                          <span className="text-xs text-[#229ED9] font-mono">@{status.botInfo.username}</span>
                        </div>
                        <p className="text-xs text-white/60">Live & listening to Telegram commands</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <a
                        href={`https://t.me/${status.botInfo.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec3] text-white text-xs font-bold transition-all shadow-md shadow-[#229ED9]/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open in Telegram
                      </a>
                      <button
                        onClick={copyBotLink}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all flex items-center gap-1"
                        title="Copy bot link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink ? 'Copied' : 'Share'}
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10 text-center">
                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                      <div className="text-base font-bold text-white">{status.stats.messagesProcessed}</div>
                      <div className="text-[10px] text-white/50">Messages Handled</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                      <div className="text-base font-bold text-emerald-400">{status.stats.searchesPerformed}</div>
                      <div className="text-[10px] text-white/50">Booru Searches</div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                      <div className="text-base font-bold text-rose-400">{status.stats.mediaSent}</div>
                      <div className="text-[10px] text-white/50">Artworks Sent</div>
                    </div>
                  </div>

                  {/* Rating Mode Badge */}
                  <div className="mt-4 pt-3 flex items-center justify-between text-xs text-white/70">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">Rating Mode:</span>
                      <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] border bg-rose-500/20 border-rose-500/40 text-rose-300 flex items-center gap-1.5 shadow-sm">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        NSFW / Unrestricted (18+ Default)
                      </span>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      disabled={isLoading}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline"
                    >
                      <PowerOff className="w-3.5 h-3.5" /> Disconnect Bot
                    </button>
                  </div>
                </div>
              ) : null}

              {/* BotFather Token Form */}
              <form onSubmit={handleConnect} className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-[#229ED9]" />
                    {status?.isRunning ? 'Update / Change Bot Token' : 'Attach BotFather Token'}
                  </label>
                  {status?.tokenMasked && (
                    <span className="text-[11px] font-mono text-white/40">Current: {status.tokenMasked}</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#229ED9] focus:border-[#229ED9] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-[#229ED9] hover:bg-[#1d8ec4] text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-[#229ED9]/20"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    {status?.isRunning ? 'Restart & Sync Bot' : 'Connect & Launch Bot'}
                  </button>
                  {status?.isRunning && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isLoading}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-white text-xs font-semibold transition-all border border-white/10"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </form>

              {/* BotFather Quick Setup Guide */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#229ED9]" />
                    How to get a Token in 30 seconds:
                  </h4>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#229ED9] hover:underline flex items-center gap-1"
                  >
                    Open @BotFather <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ol className="text-xs text-white/60 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Open Telegram and search for <strong className="text-white">@BotFather</strong></li>
                  <li>Send <code className="bg-white/10 text-[#229ED9] px-1.5 py-0.5 rounded">/newbot</code> and choose a Name and Username (must end in `bot`)</li>
                  <li>BotFather will reply with your HTTP API token (e.g. <code className="text-white/80 font-mono">712345678:AAH...</code>)</li>
                  <li>Paste it into the field above and click <strong>Connect & Launch Bot</strong></li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: Bot Features & Guide */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  What Telegram Users Can Do
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Once your bot is connected, anyone on Telegram can interact with OCTΛGRΛM using commands, text messages, or inline queries!
                </p>

                <div className="grid gap-2.5 mt-3">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 font-mono text-xs">/search</div>
                    <div className="text-xs">
                      <div className="font-bold text-white">Search Anime Art & Media</div>
                      <div className="text-white/50">Send <code className="text-white/80">/search neko</code> or simply type <code className="text-white/80">genshin</code> directly. The bot fetches top results from Danbooru, Gelbooru, Yande.re, Safebooru, Rule34, and more.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs">/random</div>
                    <div className="text-xs">
                      <div className="font-bold text-white">Roll Random Masterpiece</div>
                      <div className="text-white/50">Instant delivery of high-rated anime artworks and wallpapers.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 font-mono text-xs">/image</div>
                    <div className="text-xs">
                      <div className="font-bold text-white">HD Anime Image Search</div>
                      <div className="text-white/50">Send <code className="text-white/80">/image neko</code> for high-resolution static anime artwork and wallpapers.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 font-mono text-xs">/video</div>
                    <div className="text-xs">
                      <div className="font-bold text-white">High Quality Videos & MP4</div>
                      <div className="text-white/50">Send <code className="text-white/80">/video oppai</code> for streaming HQ MP4 video clips, webm transcodes, and animations.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-xs">/gif</div>
                    <div className="text-xs">
                      <div className="font-bold text-white">Animated GIFs & Video Loops</div>
                      <div className="text-white/50">Send <code className="text-white/80">/gif waifu</code> for short animated loops and GIFs.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs">/tags</div>
                    <div className="text-xs">
                      <div className="font-bold text-white">Interactive Category Keyboard</div>
                      <div className="text-white/50">Browse popular tags: Waifu, Neko, Kitsune, Maid, Yandere, Chibi, Aesthetic, etc.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 font-mono text-xs">🔞 NSFW</div>
                    <div className="text-xs">
                      <div className="font-bold text-white">Unrestricted (18+ Default Mode)</div>
                      <div className="text-white/50">Safe mode is disabled on Telegram; the bot serves unrestricted adult booru media by default.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#229ED9]/10 text-[#229ED9] font-mono text-xs">@bot</div>
                    <div className="text-xs">
                      <div className="font-bold text-white">Inline Search in any Telegram Chat</div>
                      <div className="text-white/50">Type <code className="text-white/80">@{status?.botInfo?.username || 'your_bot'} miku</code> in any Telegram group or private chat to send art inline without leaving the conversation!</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Live Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Real-time Telegram Bot Activity Log:</span>
                <button
                  onClick={fetchLogs}
                  className="text-xs text-[#229ED9] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              <div className="bg-black/80 rounded-2xl p-3 border border-white/10 font-mono text-[11px] max-h-72 overflow-y-auto space-y-1.5 shadow-inner">
                {logs.length === 0 ? (
                  <div className="text-white/30 text-center py-6">No activity logs recorded yet.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 leading-tight">
                      <span className="text-white/30 flex-shrink-0">[{log.timestamp}]</span>
                      <span
                        className={`font-semibold uppercase flex-shrink-0 ${
                          log.level === 'error'
                            ? 'text-rose-400'
                            : log.level === 'warn'
                            ? 'text-amber-400'
                            : log.level === 'success'
                            ? 'text-emerald-400'
                            : 'text-[#229ED9]'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-white/80 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>9+ Booru Engines Connected</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
