import React from 'react';
import { Search, ShieldAlert, ShieldCheck, Film, Image as ImageIcon, Send } from 'lucide-react';

interface NavbarProps {
  onSearch: (query: string) => void;
  nsfw: boolean;
  setNsfw: (nsfw: boolean) => void;
  gifOnly: boolean;
  setGifOnly: (gifOnly: boolean) => void;
  onOpenTelegramModal: () => void;
  telegramBotOnline?: boolean;
  telegramBotUsername?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onSearch, 
  nsfw, 
  setNsfw, 
  gifOnly, 
  setGifOnly,
  onOpenTelegramModal,
  telegramBotOnline = false,
  telegramBotUsername = null
}) => {
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <nav className="w-full px-4 pt-4 pb-2">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tighter text-white drop-shadow-md">
            N/Sfw <span className="text-rose-500">~</span> 𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠
          </h1>
        </div>

        <div className="flex flex-1 max-w-xl w-full">
          <form onSubmit={handleSubmit} className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 group-focus-within:text-rose-400 transition-colors drop-shadow-md" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artifacts (e.g. milf, oppai, scenery, waifu)..."
              className="w-full bg-black/40 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-rose-500/80 focus:border-rose-500/80 transition-all"
            />
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Telegram Bot Button */}
          <button
            onClick={onOpenTelegramModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all shadow-lg backdrop-blur-md ${
              telegramBotOnline
                ? 'bg-[#229ED9]/25 hover:bg-[#229ED9]/40 border-[#229ED9]/60 text-white shadow-[#229ED9]/20'
                : 'bg-black/40 hover:bg-white/10 border-white/20 text-white/80 hover:text-white'
            }`}
            title="Configure Telegram Bot with BotFather Token"
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${telegramBotOnline ? 'bg-[#229ED9] text-white' : 'text-[#229ED9]'}`}>
              <Send className="w-2.5 h-2.5 -rotate-12 translate-x-0.2" />
            </div>
            <span>{telegramBotOnline ? `@${telegramBotUsername || 'bot'}` : 'Telegram Bot'}</span>
            <span className={`w-2 h-2 rounded-full ${telegramBotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
          </button>

          {/* Media Format Filter: Images vs Videos */}
          <div className="flex bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-lg">
            <button
              onClick={() => setGifOnly(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                !gifOnly ? 'bg-cyan-600 text-white shadow-md' : 'text-white/70 hover:text-white'
              }`}
              title="Browse HD Static Artwork"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Images
            </button>
            <button
              onClick={() => setGifOnly(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                gifOnly ? 'bg-purple-600 text-white shadow-md' : 'text-white/70 hover:text-white'
              }`}
              title="Browse HQ Videos, MP4s & Animated Clips"
            >
              <Film className="w-3.5 h-3.5" /> Videos
            </button>
          </div>

          <div className="flex bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-lg">
            <button
              onClick={() => setNsfw(false)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                !nsfw ? 'bg-emerald-600 text-white shadow-md' : 'text-white/70 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Safe
            </button>
            <button
              onClick={() => setNsfw(true)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                nsfw ? 'bg-rose-600 text-white shadow-md' : 'text-white/70 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> NSFW
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
