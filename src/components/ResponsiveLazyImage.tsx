import React, { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ResponsiveLazyImageProps {
  src: string;
  alt: string;
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto';
  sizes?: string;
  /** Retained for backwards API compatibility; lazy deferral is disabled for instant rendering. */
  deferDuringHeavyWork?: boolean;
  priority?: 'auto' | 'high' | 'low';
  eager?: boolean;
  fallbackIcon?: React.ReactNode;
  fallbackTitle?: string;
  className?: string;
  imgClassName?: string;
  overlayScrim?: boolean;
  children?: React.ReactNode;
}

const loadedImageCache = new Set<string>();

export function preloadStudioImages(urls: string[]): void {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    if (!url || loadedImageCache.has(url)) continue;
    const img = new Image();
    img.decoding = 'sync';
    img.onload = () => {
      loadedImageCache.add(url);
    };
    img.src = url;
  }
}

export const ResponsiveLazyImage: React.FC<ResponsiveLazyImageProps> = ({
  src,
  alt,
  aspectRatio = '16/9',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 960px',
  priority = 'high',
  fallbackIcon,
  fallbackTitle,
  className,
  imgClassName,
  overlayScrim = false,
  children,
}) => {
  const alreadyCached = Boolean(src && loadedImageCache.has(src));
  const [isLoaded, setIsLoaded] = useState<boolean>(alreadyCached);
  const [hasError, setHasError] = useState<boolean>(!src);

  useEffect(() => {
    setHasError(!src);
    setIsLoaded(Boolean(src && loadedImageCache.has(src)));
  }, [src]);

  const handleImgLoad = () => {
    if (src) loadedImageCache.add(src);
    setIsLoaded(true);
  };

  const aspectClass =
    aspectRatio === '16/9'
      ? 'aspect-video'
      : aspectRatio === '4/3'
      ? 'aspect-[4/3]'
      : aspectRatio === '1/1'
      ? 'aspect-square'
      : '';

  return (
    <div
      className={cn('relative overflow-hidden select-none', aspectClass, className)}
      style={{
        background:
          'var(--theme-gradient, linear-gradient(135deg, var(--theme-accent), var(--theme-accent-2, var(--theme-accent))))',
      }}
    >
      {/* Styled gradient & domain fallback while loading or on error */}
      {(!isLoaded || hasError) && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16), transparent 55%), var(--theme-gradient, linear-gradient(135deg, var(--theme-accent), var(--theme-accent-2, var(--theme-accent))))',
          }}
        >
          {fallbackIcon || <ImageIcon size={20} className="text-white/80" />}
          {fallbackTitle && (
            <span className="text-[11px] font-semibold text-white/90 px-3 text-center truncate max-w-full">
              {fallbackTitle}
            </span>
          )}
        </div>
      )}

      {Boolean(src) && !hasError && (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading="eager"
          decoding="sync"
          fetchPriority={priority === 'low' ? 'auto' : priority}
          referrerPolicy="no-referrer"
          onLoad={handleImgLoad}
          onError={() => {
            setHasError(true);
            setIsLoaded(false);
          }}
          className={cn(
            'w-full h-full object-cover',
            alreadyCached ? 'opacity-100' : 'transition-opacity duration-150',
            isLoaded ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
        />
      )}

      {overlayScrim && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10 pointer-events-none"
        />
      )}

      {children}
    </div>
  );
};
