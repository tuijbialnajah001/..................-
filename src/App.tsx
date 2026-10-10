import React from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { MediaCard } from './components/MediaCard';
import { DownloadBasket } from './components/DownloadBasket';
import { TelegramBotModal } from './components/TelegramBotModal';
import { Media } from './types';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [media, setMedia] = React.useState<Media[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nsfw, setNsfw] = React.useState<boolean>(false);
  const [gifOnly, setGifOnly] = React.useState<boolean>(false);
  const [basket, setBasket] = React.useState<Media[]>([]);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = React.useState(false);
  const [telegramStatus, setTelegramStatus] = React.useState<any>(null);
  const loaderRef = React.useRef<HTMLDivElement>(null);

  // Poll telegram bot status on mount
  React.useEffect(() => {
    const checkTelegram = async () => {
      try {
        const res = await axios.get('/api/telegram/status');
        setTelegramStatus(res.data);
      } catch {
        // Ignored
      }
    };
    checkTelegram();
    const interval = setInterval(checkTelegram, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMedia = async (searchQuery: string, isNsfw: boolean, pageNum: number, isGif: boolean) => {
    setLoading(true);
    if (pageNum === 1) {
      setError(null);
    }
    try {
      const response = await axios.get('/api/search', {
        params: { query: searchQuery, nsfw: isNsfw, page: pageNum, per_page: 200, gif: isGif }
      });
      
      const results = response.data.posts || [];
      const total = response.data.total || 0;
      
      setHasMore(results.length > 0 && total > pageNum * 200);
      setMedia(prev => {
        const currentItems = pageNum === 1 ? [] : prev;
        const incomingItems = results.map((item: Media, index: number) => ({ 
          ...item, 
          originalIndex: currentItems.length + index 
        }));

        // Deduplicate incoming items and filter against existing items
        const uniqueIncoming = incomingItems.filter((item: any, index: number) => {
          const isInternalDuplicate = incomingItems.findIndex(i => i.id === item.id || (i.file_url === item.file_url && item.file_url)) !== index;
          const isExternalDuplicate = currentItems.some(p => p.id === item.id || (p.file_url === item.file_url && item.file_url));
          return !isInternalDuplicate && !isExternalDuplicate;
        });

        return [...currentItems, ...uniqueIncoming];
      });
    } catch (err: any) {
      if (pageNum === 1) setError(err.response?.data?.error || 'Failed to fetch media artifacts.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchMedia(query, nsfw, 1, gifOnly);
  }, [nsfw, gifOnly]);

  React.useEffect(() => {
    if (page > 1) {
      fetchMedia(query, nsfw, page, gifOnly);
    }
  }, [page]);

  const handleObserver = React.useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver, media.length]);

  const toggleBasket = (item: Media) => {
    setBasket(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, item];
    });
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-zinc-950 text-white selection:bg-rose-500/30 overflow-hidden">
      <div className="flex-none bg-zinc-950 z-40 border-b border-white/10">
        <Navbar 
          onSearch={(q) => { 
            setQuery(q); 
            setPage(1);
            setHasMore(true);
            fetchMedia(q, nsfw, 1, gifOnly); 
          }} 
          nsfw={nsfw}
          setNsfw={setNsfw}
          gifOnly={gifOnly}
          setGifOnly={setGifOnly}
          onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
          telegramBotOnline={!!telegramStatus?.isRunning}
          telegramBotUsername={telegramStatus?.botInfo?.username}
        />

        <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            'waifu', 'husbando', 'neko', 'kitsune', 'maid', 'yandere', 
            'tsundere', 'kuudere', 'dandere', 'chibi', 'catgirl', 'foxgirl', 
            'elf', 'angel', 'demon', 'samurai', 'ninja', 'miko', 
            'shrinemaiden', 'princess', 'knight', 'goddess', 'vampire', 
            'witch', 'aesthetic', 'pixel', 'char'
          ].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                setPage(1);
                setHasMore(true);
                fetchMedia(tag, nsfw, 1, gifOnly);
              }}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-all whitespace-nowrap shadow-sm ${
                query === tag 
                  ? 'bg-rose-500/80 border-rose-400 text-white' 
                  : 'bg-white/5 border-white/20 text-white/90 hover:bg-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
          {nsfw && [
            'pussy', 'pov', 'feet', 'cum', 'milf', 'oppai', 'hentai', 'ass', 'boobs',
            'yuri', 'bdsm'
          ].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                setPage(1);
                setHasMore(true);
                fetchMedia(tag, nsfw, 1, gifOnly);
              }}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-all whitespace-nowrap shadow-sm ${
                query === tag 
                  ? 'bg-rose-500/80 border-rose-400 text-white' 
                  : 'bg-white/5 border-rose-900/50 text-rose-200/90 hover:bg-white/10'
              }`}
            >
              <span className="mr-1">♥</span>{tag}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 min-h-0 w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar relative bg-black">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Oops! Execution Halted</h2>
            <p className="text-white/40 max-w-md">{error}</p>
          </div>
        ) : loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
            <p className="text-white/40 font-medium animate-pulse">Scanning Vaults...</p>
          </div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Sparkles className="w-16 h-16 text-white/10 mb-4" />
            <h2 className="text-2xl font-bold text-white/20">No artifacts found</h2>
            <p className="text-white/40">Try searching for different tags</p>
          </div>
        ) : (
          <>
            {media.map((item, index) => (
              <div key={`${item.id}-${index}`} className="h-full w-full snap-start snap-always relative flex items-center justify-center bg-zinc-950/80 shrink-0">
                <MediaCard
                  item={item}
                  isInBasket={basket.some(i => i.id === item.id)}
                  toggleBasket={toggleBasket}
                />
              </div>
            ))}
            
            {/* Infinite Scroll Loader Sentinel */}
            <div ref={loaderRef} className="py-10 flex justify-center snap-start h-32 items-center bg-black">
              {hasMore && loading && (
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              )}
              {!hasMore && media.length > 0 && (
                <p className="text-white/40 text-sm">You've reached the end of the vault.</p>
              )}
            </div>
          </>
        )}
      </main>

      <DownloadBasket 
        items={basket} 
        allMedia={media}
        removeItem={(id) => setBasket(prev => prev.filter(i => i.id !== id))}
        clearBasket={() => setBasket([])}
      />

      {/* Telegram Bot Modal */}
      <TelegramBotModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onStatusChange={setTelegramStatus}
      />

      <footer className="mt-20 border-t border-white/5 py-10 px-6 text-center">
        <p className="text-white/20 text-sm flex items-center justify-center gap-2">
          Powered by Yande.re, Danbooru, Konachan, Gelbooru, Safebooru, Rule34, Xbooru & TBIB APIs • Open Source Media Discovery
        </p>
      </footer>
    </div>
  );
}
