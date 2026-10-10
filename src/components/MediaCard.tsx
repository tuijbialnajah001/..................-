import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, Plus, Check, Play, Pause, Loader2, Settings, Maximize } from 'lucide-react';
import { Media } from '../types';
import axios from 'axios';
import { saveAs } from 'file-saver';

interface MediaCardProps {
  item: Media;
  isInBasket: boolean;
  toggleBasket: (item: Media) => void;
  onPreviewLoad?: (id: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, isInBasket, toggleBasket, onPreviewLoad }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [useProxyForPreview, setUseProxyForPreview] = useState(false);
  const [useProxyForSample, setUseProxyForSample] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadedBlobUrl, setLoadedBlobUrl] = useState<string | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const downloadCancelTokenRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (loadedBlobUrl) {
        URL.revokeObjectURL(loadedBlobUrl);
      }
      if (downloadCancelTokenRef.current) {
        downloadCancelTokenRef.current.abort();
      }
    };
  }, [loadedBlobUrl]);

  const handlePreviewError = () => {
    if (!useProxyForPreview) {
      setUseProxyForPreview(true);
    } else {
      setErrorCount(prev => prev + 1);
    }
  };

  const handleSampleError = () => {
    if (!useProxyForSample) {
      setUseProxyForSample(true);
    } else {
      setErrorCount(prev => prev + 1);
    }
  };

  const handleReload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorCount(0);
    setUseProxyForPreview(false);
    setUseProxyForSample(false);
    setIsLoaded(false);
    setIsHighResLoaded(false);
    setIsPlaying(false);
    setIsBuffering(false);
  };

  const previewUrl = item.preview_url || item.file_url;
  const isVideo = !!item.file_url?.toLowerCase().match(/\.(mp4|webm|mov)(\?.*)?$/i);
  const isGif = !!item.file_url?.toLowerCase().match(/\.gif(\?.*)?$/i);
  const isAnimated = isVideo || isGif;
  
  const sampleUrl = item.sample_url || item.file_url;
  const downloadUrl = item.file_url || item.sample_url;

  // Detect and organize video quality variants
  const getQualityOptions = () => {
    const options: { label: string; url: string; type: string }[] = [];
    
    // Check if variants are present from Danbooru/Gelbooru
    if (item.variants && item.variants.length > 0) {
      const v360 = item.variants.find(v => v.type === '360p' && v.url.toLowerCase().match(/\.(mp4|webm|mov)(\?.*)?$/i));
      const v720 = item.variants.find(v => v.type === '720p' && v.url.toLowerCase().match(/\.(mp4|webm|mov)(\?.*)?$/i));
      const v1080 = item.variants.find(v => v.type === '1080p' && v.url.toLowerCase().match(/\.(mp4|webm|mov)(\?.*)?$/i));
      const vSample = item.variants.find(v => v.type === 'sample' && v.url.toLowerCase().match(/\.(mp4|webm|mov)(\?.*)?$/i));
      const vOriginal = item.variants.find(v => v.type === 'original' && v.url.toLowerCase().match(/\.(mp4|webm|mov)(\?.*)?$/i));

      if (v360) options.push({ label: '360p', url: v360.url, type: '360p' });
      if (v720) options.push({ label: '720p', url: v720.url, type: '720p' });
      if (v1080) options.push({ label: '1080p', url: v1080.url, type: '1080p' });
      if (vSample && !v720) options.push({ label: 'Low', url: vSample.url, type: 'sample' });
      if (vOriginal) options.push({ label: 'Original', url: vOriginal.url, type: 'original' });
    }

    // Fallbacks if no video variants were mapped explicitly
    if (options.length === 0) {
      const sampleIsVideo = !!item.sample_url?.toLowerCase().match(/\.(mp4|webm|mov)(\?.*)?$/i);
      const fileIsVideo = !!item.file_url?.toLowerCase().match(/\.(mp4|webm|mov)(\?.*)?$/i);

      if (sampleIsVideo && item.sample_url) {
        options.push({ label: 'Low', url: item.sample_url, type: 'sample' });
      }
      if (fileIsVideo && item.file_url && item.file_url !== item.sample_url) {
        options.push({ label: 'Original', url: item.file_url, type: 'original' });
      } else if (options.length === 0 && fileIsVideo && item.file_url) {
        options.push({ label: 'Original', url: item.file_url, type: 'original' });
      }
    }

    return options;
  };

  const qualityOptions = getQualityOptions();

  // Find a default quality: prefer '360p' first, then 'sample' / 'Low', then '720p', then 'Original'
  const getDefaultQuality = () => {
    if (qualityOptions.length === 0) return null;
    const preferredOrder = ['360p', 'Low', 'sample', '720p', '1080p', 'Original', 'original'];
    for (const type of preferredOrder) {
      const found = qualityOptions.find(o => o.type === type || o.label === type);
      if (found) return found;
    }
    return qualityOptions[0]; // fallback
  };

  const [selectedQuality, setSelectedQuality] = useState<{ label: string; url: string; type: string } | null>(null);

  // Clear loaded blob url when quality or source video url changes
  const currentVideoUrl = selectedQuality ? selectedQuality.url : sampleUrl;

  useEffect(() => {
    if (loadedBlobUrl) {
      URL.revokeObjectURL(loadedBlobUrl);
      setLoadedBlobUrl(null);
    }
    if (downloadCancelTokenRef.current) {
      downloadCancelTokenRef.current.abort();
      downloadCancelTokenRef.current = null;
    }
  }, [currentVideoUrl]);

  useEffect(() => {
    if (isVideo) {
      const def = getDefaultQuality();
      if (def) {
        setSelectedQuality(def);
      }
    } else {
      setSelectedQuality(null);
    }
  }, [item.id, isVideo]);

  const attemptPlay = () => {
    if (!videoRef.current) return;
    const promise = videoRef.current.play();
    playPromiseRef.current = promise;
    promise
      .then(() => {
        playPromiseRef.current = null;
        setIsPlaying(true);
        setIsBuffering(false);
      })
      .catch((err) => {
        playPromiseRef.current = null;
        if (err.name === 'NotAllowedError') {
           // Browser blocked autoplay with sound. Mute and play again.
           if (videoRef.current) {
             videoRef.current.muted = true;
             const retryPromise = videoRef.current.play();
             retryPromise.then(() => {
               setIsPlaying(true);
               setIsBuffering(false);
             }).catch(() => {
               setIsBuffering(false);
               setIsPlaying(false);
             });
           }
        } else if (err.name !== 'AbortError' && err.message?.indexOf('interrupted') === -1) {
          console.error("Failed to play video:", err);
          setIsBuffering(false);
          setIsPlaying(false);
        } else {
          setIsBuffering(false);
        }
      });
  };

  const safePlay = () => {
    if (videoRef.current) {
      // Dispatch event to pause other videos before we play
      window.dispatchEvent(new CustomEvent('video-played', { detail: { cardId: item.id } }));
      attemptPlay();
    }
  };

  const safePause = () => {
    setIsBuffering(false);
    if (videoRef.current) {
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            if (videoRef.current) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          })
          .catch(() => {
            if (videoRef.current) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          });
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // Coordinated pausing: listen for other videos starting playback
  useEffect(() => {
    const handleOtherVideoPlayed = (e: Event) => {
      const customEvent = e as CustomEvent<{ cardId: string }>;
      if (customEvent.detail && customEvent.detail.cardId !== item.id) {
        safePause();
      }
    };

    window.addEventListener('video-played', handleOtherVideoPlayed);
    return () => {
      window.removeEventListener('video-played', handleOtherVideoPlayed);
    };
  }, [item.id]);

  const changeQuality = (option: { label: string; url: string; type: string }) => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    const wasPlaying = isPlaying;
    
    // Pause safely first
    safePause();
    
    setSelectedQuality(option);
    setIsLoaded(false);
    setIsBuffering(true);
    
    // Wait for the video element to pick up the updated source url, then seek to previous time and continue
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) {
          safePlay();
        } else {
          setIsBuffering(false);
        }
      }
    }, 100);
  };

  const proxiedPreviewUrl = useProxyForPreview ? `/api/proxy-media?url=${encodeURIComponent(previewUrl)}` : previewUrl;
  const proxiedVideoUrl = useProxyForSample ? `/api/proxy-media?url=${encodeURIComponent(currentVideoUrl)}` : currentVideoUrl;
  const proxiedSampleUrl = useProxyForSample ? `/api/proxy-media?url=${encodeURIComponent(sampleUrl)}` : sampleUrl;

  useEffect(() => {
    // Observer for caching (loads image/video when it gets close)
    const cacheObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { rootMargin: '1500px' }
    );

    // Observer for playing (only plays when mostly in center of screen)
    const playObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (isVideo && videoRef.current) {
             safePlay();
          }
        } else {
          if (isVideo && videoRef.current) {
            safePause();
          }
        }
      },
      { threshold: 0.6 }
    );

    if (cardRef.current) {
      cacheObserver.observe(cardRef.current);
      playObserver.observe(cardRef.current);
    }

    return () => {
      cacheObserver.disconnect();
      playObserver.disconnect();
    };
  }, [isAnimated, currentVideoUrl]);

  const handlePreviewLoad = () => {
    setIsLoaded(true);
    if (onPreviewLoad) onPreviewLoad(item.id);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!downloadUrl || isDownloading) return;

    try {
      setIsDownloading(true);
      const response = await axios.get(`/api/proxy-media?url=${encodeURIComponent(downloadUrl)}`, {
        responseType: 'blob'
      });
      
      const urlExt = downloadUrl.split('.').pop()?.split('?')[0];
      let extension = urlExt || 'jpg';
      if (extension.length > 4) extension = 'jpg';
      
      saveAs(response.data, `Octagram_vault_${item.id}.${extension}`);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback if proxy fails
      window.open(downloadUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking quality switch buttons or any control buttons, do not toggle playback
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (isVideo && videoRef.current) {
      if (videoRef.current.muted) {
        // If it was auto-muted, unmuting might work now because this is a user gesture
        videoRef.current.muted = false;
        if (!isPlaying) safePlay();
      } else {
        if (isPlaying) {
          safePause();
        } else {
          safePlay();
        }
      }
    }
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      className={`group relative w-full h-full overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center ${isVideo ? 'cursor-pointer' : ''}`}
    >
      {!isLoaded && isInView && !isVideo && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
        </div>
      )}

      {errorCount > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-zinc-900/90 backdrop-blur-sm p-4 text-center">
          <p className="text-white/40 text-xs mb-3 font-medium">Failed to load artifact</p>
          <button 
            onClick={handleReload}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all border border-white/10"
          >
            Reload Image
          </button>
        </div>
      )}

      {/* Quality selector pill buttons overlay (visible on hover) */}
      {isVideo && isInView && qualityOptions.length > 1 && (
        <div className={`absolute top-3 right-3 z-30 transition-all duration-300 flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 shadow-lg ${isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
          <Settings className="w-3 h-3 text-white/40 mr-1 flex-shrink-0 animate-spin-slow" />
          <div className="flex gap-1">
            {qualityOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={(e) => {
                  e.stopPropagation();
                  changeQuality(opt);
                }}
                className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all ${
                  selectedQuality?.type === opt.type
                    ? 'bg-rose-600 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isVideo ? (
        <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-900">
              <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            </div>
          )}
          <video 
            ref={videoRef}
            src={loadedBlobUrl || proxiedVideoUrl} 
            className={`w-full h-full max-w-full max-h-full object-contain transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
            loop 
            playsInline
            preload="auto"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsPlaying(true);
            }}
            onCanPlay={() => setIsBuffering(false)}
            onLoadedData={() => {
              setIsLoaded(true);
              setIsBuffering(false);
            }}
            onError={handleSampleError}
          />
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
          {/* Low-res preview placeholder */}
          <img
            src={proxiedPreviewUrl}
            alt={item.tags}
            loading="lazy"
            className={`absolute inset-0 w-full h-full max-w-full max-h-full object-contain transition-all duration-700 ${isHighResLoaded || (isGif && isLoaded) ? 'opacity-0' : (isLoaded ? 'opacity-100 blur-sm' : 'opacity-0')}`}
            referrerPolicy="no-referrer"
            onLoad={handlePreviewLoad}
            onError={handlePreviewError}
          />
          {/* High-res sample or GIF */}
          <img
            src={proxiedSampleUrl}
            alt={item.tags}
            loading="lazy"
            className={`absolute inset-0 w-full h-full max-w-full max-h-full object-contain transition-all duration-700 ${(isHighResLoaded || (isGif && isLoaded)) ? 'opacity-100 blur-0' : 'opacity-0'}`}
            referrerPolicy="no-referrer"
            onLoad={() => {
              setIsHighResLoaded(true);
              if (isGif) setIsLoaded(true);
            }}
            onError={handleSampleError}
          />
        </div>
      )}
      
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {/* Buffer Spinner */}
          {isBuffering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300 gap-2">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          
          {/* Play state overlay - Hidden completely during active playback */}
          {!isPlaying && !isBuffering && (
            <div className="scale-100 opacity-100 transition-all duration-300 transform">
              <div className="bg-black/60 hover:bg-black/80 backdrop-blur-md p-4 rounded-full border border-white/20 shadow-lg">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6 transition-opacity duration-500 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
        <p className="text-white text-base font-medium mb-4 line-clamp-3 leading-snug drop-shadow-md">
          {item.tags.split(' ').slice(0, 10).join(', ')}
        </p>
        
        <div className={`flex gap-3 pointer-events-auto ${isPlaying ? 'pointer-events-none' : ''}`}>
          {isVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  if (videoRef.current.requestFullscreen) {
                    videoRef.current.requestFullscreen();
                  } else if ((videoRef.current as any).webkitRequestFullscreen) {
                    (videoRef.current as any).webkitRequestFullscreen();
                  } else if ((videoRef.current as any).webkitEnterFullscreen) {
                    (videoRef.current as any).webkitEnterFullscreen();
                  }
                }
              }}
              className="w-10 flex flex-shrink-0 items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl transition-all"
            >
              <Maximize className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(e); }}
            disabled={isDownloading}
            className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isVideo ? 'Video' : 'Image'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleBasket(item); }}
            className={`w-10 flex flex-shrink-0 items-center justify-center rounded-xl border transition-all ${
              isInBasket 
                ? 'bg-emerald-600 border-emerald-500 text-white' 
                : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500'
            }`}
          >
            {isInBasket ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
