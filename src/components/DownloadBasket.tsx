import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, X, Download, Loader2, Files, CheckCircle2 } from 'lucide-react';
import { Media } from '../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';

interface DownloadBasketProps {
  items: Media[];
  removeItem: (id: string) => void;
  clearBasket: () => void;
  allMedia: Media[];
}

export const DownloadBasket: React.FC<DownloadBasketProps> = ({ items, removeItem, clearBasket, allMedia }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [progress, setProgress] = useState({ phase: '', loaded: 0, total: 0 });
  const [cache, setCache] = useState<Map<string, ArrayBuffer>>(new Map());
  const [prefectchingIds, setPrefetchingIds] = useState<Set<string>>(new Set());

  // Background Prefetcher: Starts downloading images to memory as soon as they are in the basket
  useEffect(() => {
    const activeDownloads = prefectchingIds.size;
    const maxConcurrency = 3; // Keep some bandwidth for UI
    
    if (activeDownloads >= maxConcurrency) return;

    // Find the first item that isn't cached and isn't currently being fetched
    const priorityItem = items.find(item => !cache.has(item.id) && !prefectchingIds.has(item.id));
    const nextItem = priorityItem || allMedia.find(item => !cache.has(item.id) && !prefectchingIds.has(item.id));
    
    if (nextItem) {
      const id = nextItem.id;
      // Use compressed sample for prefetching as requested
      const targetUrl = nextItem.sample_url || nextItem.file_url;
      
      axios.get(`/api/proxy-media?url=${encodeURIComponent(targetUrl)}`, {
        responseType: 'arraybuffer'
      }).then(res => {
        // Simple sanity check for binary vs HTML
        let isHtml = false;
        try {
          const text = new TextDecoder('utf-8').decode(new Uint8Array(res.data).slice(0, 100));
          if (text.trim().startsWith('<')) isHtml = true;
        } catch(e) {}

        if (!isHtml) {
          setCache(prev => new Map(prev).set(id, res.data));
        }
      }).catch(() => {
        console.warn(`Pre-fetch failed for ${id}`);
      }).finally(() => {
        setPrefetchingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    }
  }, [allMedia, items, cache, prefectchingIds]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadBundle = async () => {
    if (items.length === 0) return;
    setIsZipping(true);
    setProgress({ phase: 'Readying files...', loaded: 0, total: items.length });
    const zip = new JSZip();
    
    let failedCount = 0;
    const concurrencyLimit = 6;
    let completedCount = 0;

    try {
      const processItem = async (item: Media) => {
        const url = item.sample_url || item.file_url;
        if (!url) {
          failedCount++;
          completedCount++;
          return;
        }

        try {
          let data = cache.get(item.id);
          
          if (!data) {
            const response = await axios.get(`/api/proxy-media?url=${encodeURIComponent(url)}`, {
              responseType: 'arraybuffer'
            });
            data = response.data;
          }
          
          const urlExt = url.split('.').pop()?.split('?')[0];
          let extension = urlExt || 'jpg';
          if (extension.length > 4) extension = 'jpg';
          const fileName = `𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠_${item.id}.${extension}`;
          
          if (data) {
            zip.file(fileName, data);
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error(`Failed to bundle item ${item.id}:`, err);
          failedCount++;
        } finally {
          completedCount++;
          setProgress({ 
            phase: `Zipping (${completedCount}/${items.length})...`, 
            loaded: completedCount, 
            total: items.length 
          });
        }
      };

      const queue = [...items];
      const workers = Array(concurrencyLimit).fill(null).map(async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item) await processItem(item);
        }
      });

      await Promise.all(workers);

      if (failedCount === items.length) {
        throw new Error("All downloads failed.");
      }
      
      setProgress({ phase: 'Compressing...', loaded: items.length, total: items.length });
      
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: "DEFLATE",
        compressionOptions: { level: 5 }
      });
      
      saveAs(content, `octagram-vault-bundle-${Date.now()}.zip`);
      if (failedCount > 0) {
        alert(`${items.length - failedCount} items bundled successfully. ${failedCount} failed.`);
      }
      clearBasket();
      setIsExpanded(false);
    } catch (error) {
      console.error("Zipping failed:", error);
      alert("Failed to create ZIP bundle.");
    } finally {
      setIsZipping(false);
      setProgress({ phase: '', loaded: 0, total: 0 });
    }
  };

  const handleIndividualDownload = async () => {
    if (items.length === 0) return;
    setIsZipping(true);
    let completedCount = 0;

    try {
      for (const item of items) {
        const url = item.sample_url || item.file_url;
        if (!url) continue;

        try {
          setProgress({ 
            phase: `Downloading (${completedCount + 1}/${items.length})...`, 
            loaded: completedCount + 1, 
            total: items.length 
          });

          let blob;
          const cachedData = cache.get(item.id);
          
          if (cachedData) {
            blob = new Blob([cachedData]);
          } else {
            const response = await axios.get(`/api/proxy-media?url=${encodeURIComponent(url)}`, {
              responseType: 'blob'
            });
            blob = response.data;
          }

          const urlExt = url.split('.').pop()?.split('?')[0];
          let extension = urlExt || 'jpg';
          if (extension.length > 4) extension = 'jpg';
          
          saveAs(blob, `𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠_${item.id}.${extension}`);
          
          // Rapid fire: 300ms is usually enough to let the browser queue downloads without trigger protection
          await new Promise(r => setTimeout(r, 300));
          completedCount++;
        } catch (err) {
          console.error(`Failed individual download for ${item.id}:`, err);
        }
      }

      clearBasket();
      setIsExpanded(false);
    } catch (error) {
      console.error("Individual download failed:", error);
    } finally {
      setIsZipping(false);
      setProgress({ phase: '', loaded: 0, total: 0 });
    }
  };

  return (
    <>
      {/* Top Right Sync Indicator */}
      <div className="fixed top-24 right-6 z-[60]">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-white/5 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${prefectchingIds.size > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
            {prefectchingIds.size > 0 && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider leading-none mb-1">Vault Sync</span>
            <span className="text-sm font-mono text-white/90 leading-none">
              {cache.size}<span className="text-white/20 mx-1">/</span>{allMedia.length}
            </span>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <AnimatePresence>
            {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-72 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-semibold">Selection Bundle</h3>
              <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                {items.length} items
              </span>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-2 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg group relative">
                  <img 
                    src={item.preview_url || item.sample_url || item.file_url} 
                    className="w-10 h-10 object-cover rounded-md" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-white/60 text-[10px] block truncate">
                      ID: {item.id}
                    </span>
                    {cache.has(item.id) ? (
                      <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Ready for fast DL
                      </span>
                    ) : (
                      <span className="text-white/20 text-[10px] animate-pulse">
                        Pre-fetching...
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-white/20 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white/5 space-y-3">
              {isZipping && progress.phase && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>{progress.phase}</span>
                    {progress.total > 0 && (
                      <span>
                        {Math.round((progress.loaded / progress.total) * 100)}% ({formatBytes(progress.loaded)} / {formatBytes(progress.total)})
                      </span>
                    )}
                  </div>
                  {progress.total > 0 && (
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, (progress.loaded / progress.total) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              <button
                disabled={isZipping}
                onClick={handleDownloadBundle}
                className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-rose-600/20"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download Zip Bundle
                  </>
                )}
              </button>

              <button
                disabled={isZipping}
                onClick={handleIndividualDownload}
                className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Files className="w-4 h-4" /> Download Individually (60x)
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-3 pointer-events-auto">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-14 h-14 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-rose-600/40 relative group transition-all transform hover:scale-110 active:scale-95"
        >
          <Package className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-zinc-950 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full border-2 border-zinc-950 font-bold shadow-sm">
            {items.length}
          </span>
        </button>
      </div>
    </div>
    )}
    </>
  );
};

