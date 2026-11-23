import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize2,
  Minimize2,
  Film,
} from 'lucide-react';
import { SubtitleItem, timeStringToMs, msToTimeString } from '../utils/srtParser';
import {
  GRADIENT_PALETTES,
  computeSubtitleCssStyles,
  renderStylizedSubtitleHtml,
  hasFormatting,
} from '../utils/subtitleFormatter';
import { ActiveStylingConfig } from './StylingStudioDrawer';
import { InfoPopover } from './InfoPopover';
import { cn } from '../utils/cn';

interface StickyStylingPreviewProps {
  subtitles: SubtitleItem[];
  urduFont: string;
  originalFont: string;
  googleFont: string;
  translatedFontSize: number;
  originalFontSize: number;
  googleFontSize: number;
  activeStylingConfig: ActiveStylingConfig;
}

export const StickyStylingPreview: React.FC<StickyStylingPreviewProps> = ({
  subtitles,
  urduFont,
  originalFont,
  googleFont,
  translatedFontSize,
  originalFontSize,
  googleFontSize,
  activeStylingConfig,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [selectedStream, setSelectedStream] = useState<'ai' | 'google' | 'original' | 'dual'>('ai');
  const [expanded, setExpanded] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const totalDurationMs = useMemo(() => {
    if (subtitles.length === 0) return 30000;
    const last = subtitles[subtitles.length - 1];
    return Math.max(timeStringToMs(last.endTime) + 1500, 10000);
  }, [subtitles]);

  useEffect(() => {
    if (subtitles.length > 0 && currentTimeMs === 0) {
      setCurrentTimeMs(timeStringToMs(subtitles[0].startTime));
    }
  }, [subtitles.length]);

  const activeSubtitle = useMemo(() => {
    if (subtitles.length === 0) return null;
    const match = subtitles.find((s) => {
      const start = timeStringToMs(s.startTime);
      const end = timeStringToMs(s.endTime);
      return currentTimeMs >= start && currentTimeMs <= end;
    });
    return match || subtitles[0] || null;
  }, [subtitles, currentTimeMs]);

  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }
    const step = (now: number) => {
      if (lastTimestampRef.current !== null) {
        const delta = now - lastTimestampRef.current;
        setCurrentTimeMs((prev) => {
          const next = prev + delta;
          if (next >= totalDurationMs) {
            setIsPlaying(false);
            return totalDurationMs;
          }
          return next;
        });
      }
      lastTimestampRef.current = now;
      animationFrameRef.current = requestAnimationFrame(step);
    };
    animationFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDurationMs]);

  const togglePlay = useCallback(() => {
    if (currentTimeMs >= totalDurationMs) setCurrentTimeMs(0);
    setIsPlaying((p) => !p);
  }, [currentTimeMs, totalDurationMs]);

  const handleJumpNext = () => {
    const next = subtitles.find((s) => timeStringToMs(s.startTime) > currentTimeMs + 50);
    if (next) setCurrentTimeMs(timeStringToMs(next.startTime));
  };

  const handleJumpPrev = () => {
    const prevItems = subtitles.filter((s) => timeStringToMs(s.startTime) < currentTimeMs - 400);
    if (prevItems.length > 0) {
      setCurrentTimeMs(timeStringToMs(prevItems[prevItems.length - 1].startTime));
    } else if (subtitles.length > 0) {
      setCurrentTimeMs(timeStringToMs(subtitles[0].startTime));
    } else {
      setCurrentTimeMs(0);
    }
  };

  const activePalette = GRADIENT_PALETTES.find((p) => p.id === activeStylingConfig.paletteId);
  const activePaletteColors =
    activeStylingConfig.customColors && activeStylingConfig.customColors.length > 0
      ? activeStylingConfig.customColors
      : activePalette?.colors || ['#14b8a6', '#38bdf8'];

  const computedCss = useMemo(
    () =>
      computeSubtitleCssStyles({
        ...activeStylingConfig,
        activePaletteColors,
      }),
    [activeStylingConfig, activePaletteColors]
  );

  const renderStyledHtml = (rawText: string, index: number) => {
    if (!rawText) return '';
    if (hasFormatting(rawText)) return rawText;
    return renderStylizedSubtitleHtml(
      rawText,
      index,
      activeStylingConfig.paletteId,
      activeStylingConfig.gradientMode,
      {
        customColors: activePaletteColors,
        boldEmphasis: activeStylingConfig.boldEmphasis,
        italicize: activeStylingConfig.italicize,
        transformCase: activeStylingConfig.transformCase,
      }
    );
  };

  const sampleAiText = activeSubtitle?.translatedText || 'ہر بات میں ایک گہرا احساس چھپا ہے';
  const sampleGoogleText = activeSubtitle?.googleTranslateText || 'ہر جملہ خوبصورت انداز میں نظر آتا ہے';
  const sampleOrigText = activeSubtitle?.text || 'Every line carries a deep cinematic emotion.';
  const sampleIdx = activeSubtitle ? Math.max(0, activeSubtitle.index - 1) : 0;

  return (
    <div
      className="sticky top-[46px] lg:top-[84px] z-30 rounded-xl border overflow-hidden theme-card"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border)',
      }}
    >
      {/* Slim Simulator Header */}
      <div
        className="px-2.5 py-1 border-b flex items-center justify-between gap-2"
        style={{
          backgroundColor: 'var(--theme-elevated)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Film size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
          <span className="text-[11px] font-semibold truncate">Preview</span>
          <InfoPopover
            title="Live Cinema Preview"
            description="Pinned 16:9 simulator rendering active fonts, sizes, gradients, outlines, and shadows."
            align="left"
          />
          {activeSubtitle && (
            <span className="text-[10px] font-mono opacity-60 tabular-nums truncate">
              #{activeSubtitle.index} · {msToTimeString(currentTimeMs).slice(0, 8)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div
            className="flex items-center p-0.5 rounded-md border"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
            }}
          >
            {(
              [
                { id: 'ai', label: 'AI' },
                { id: 'google', label: 'G' },
                { id: 'original', label: 'Src' },
                { id: 'dual', label: 'Dual' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStream(s.id)}
                className={cn(
                  'min-h-[26px] px-1.5 rounded text-[10px] font-semibold cursor-pointer',
                  selectedStream === s.id ? 'text-white' : 'opacity-65 hover:opacity-100'
                )}
                style={selectedStream === s.id ? { backgroundColor: 'var(--theme-accent)' } : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-7 h-7 rounded-md border opacity-75 hover:opacity-100 flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
            }}
            aria-label={expanded ? 'Compact preview' : 'Expand preview'}
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* 16:9 Cinema Canvas */}
      <div
        className={cn(
          'relative w-full aspect-video mx-auto bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col justify-end items-center px-3 py-2.5 overflow-hidden transition-all',
          expanded ? 'max-h-[240px] sm:max-h-[300px]' : 'max-h-[145px] sm:max-h-[185px]'
        )}
      >
        <div className="relative z-10 w-full flex flex-col items-center gap-1 text-center">
          {(selectedStream === 'original' || selectedStream === 'dual') && (
            <div
              className={cn('max-w-[92%] leading-snug', computedCss.className)}
              style={{
                ...computedCss.style,
                fontFamily: originalFont,
                fontSize: `${Math.min(originalFontSize, expanded ? 26 : 19)}px`,
              }}
              dangerouslySetInnerHTML={{ __html: renderStyledHtml(sampleOrigText, sampleIdx) }}
            />
          )}

          {(selectedStream === 'ai' || selectedStream === 'dual') && (
            <div
              dir="rtl"
              className={cn('max-w-[92%] font-urdu', computedCss.className)}
              style={{
                ...computedCss.style,
                fontFamily: urduFont,
                fontSize: `${Math.min(translatedFontSize, expanded ? 28 : 20)}px`,
              }}
              dangerouslySetInnerHTML={{ __html: renderStyledHtml(sampleAiText, sampleIdx) }}
            />
          )}

          {selectedStream === 'google' && (
            <div
              dir="rtl"
              className={cn('max-w-[92%] font-urdu', computedCss.className)}
              style={{
                ...computedCss.style,
                fontFamily: googleFont,
                fontSize: `${Math.min(googleFontSize, expanded ? 28 : 20)}px`,
              }}
              dangerouslySetInnerHTML={{ __html: renderStyledHtml(sampleGoogleText, sampleIdx) }}
            />
          )}
        </div>
      </div>

      {/* Slim Scrubber */}
      <div
        className="px-2.5 py-1 border-t flex items-center gap-1.5"
        style={{
          backgroundColor: 'var(--theme-elevated)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <button
          type="button"
          onClick={togglePlay}
          className="w-7 h-7 rounded-md text-white flex items-center justify-center cursor-pointer shrink-0"
          style={{ backgroundColor: 'var(--theme-accent)' }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>

        <button
          type="button"
          onClick={handleJumpPrev}
          className="w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer shrink-0"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          aria-label="Previous"
        >
          <ChevronLeft size={12} />
        </button>

        <button
          type="button"
          onClick={handleJumpNext}
          className="w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer shrink-0"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          aria-label="Next"
        >
          <ChevronRight size={12} />
        </button>

        <input
          type="range"
          min={0}
          max={totalDurationMs}
          step={100}
          value={currentTimeMs}
          onChange={(e) => setCurrentTimeMs(Number(e.target.value))}
          className="flex-1 cursor-pointer h-1.5"
          aria-label="Timeline scrubber"
        />

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            setCurrentTimeMs(subtitles.length > 0 ? timeStringToMs(subtitles[0].startTime) : 0);
          }}
          className="w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer shrink-0 opacity-75 hover:opacity-100"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          aria-label="Reset preview"
        >
          <RotateCcw size={11} />
        </button>
      </div>
    </div>
  );
};
