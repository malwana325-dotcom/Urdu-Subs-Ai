import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  ChevronLeft,
  ChevronRight,
  FileCode,
  Film,
  Clock,
  Eye,
  Check,
  Copy,
} from 'lucide-react';
import { SubtitleItem, timeStringToMs, msToTimeString } from '../utils/srtParser';
import {
  generateFormattedSRT,
  generateASS,
  generateSSA,
  generateWebVTT,
  generateYouTubeSBV,
  generateLRC,
  generateJSONCaptions,
  hasFormatting,
} from '../utils/subtitleFormatter';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface SubtitlePreviewSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  urduFont: string;
  translatedFontSize: number;
  fileName: string;
  activeStylingConfig?: any;
}

export const SubtitlePreviewSpaceModal: React.FC<SubtitlePreviewSpaceModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  urduFont,
  translatedFontSize,
  activeStylingConfig,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedStream, setSelectedStream] = useState<'ai' | 'google' | 'original' | 'dual'>('ai');
  const [viewMode, setViewMode] = useState<'player' | 'tape' | 'code'>('player');
  const [codeFormat, setCodeFormat] = useState<'srt' | 'ass' | 'ssa' | 'vtt' | 'sbv' | 'lrc' | 'json'>('srt');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const totalDurationMs = useMemo(() => {
    if (subtitles.length === 0) return 60000;
    const lastItem = subtitles[subtitles.length - 1];
    return Math.max(timeStringToMs(lastItem.endTime) + 2000, 10000);
  }, [subtitles]);

  const activeSubtitle = useMemo(() => {
    if (subtitles.length === 0) return null;
    return (
      subtitles.find((s) => {
        const start = timeStringToMs(s.startTime);
        const end = timeStringToMs(s.endTime);
        return currentTimeMs >= start && currentTimeMs <= end;
      }) || null
    );
  }, [subtitles, currentTimeMs]);

  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const step = (now: number) => {
      if (lastTimestampRef.current !== null) {
        const delta = (now - lastTimestampRef.current) * playbackSpeed;
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
  }, [isPlaying, playbackSpeed, totalDurationMs]);

  const togglePlay = useCallback(() => {
    if (currentTimeMs >= totalDurationMs) setCurrentTimeMs(0);
    setIsPlaying((prev) => !prev);
  }, [currentTimeMs, totalDurationMs]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => setCurrentTimeMs(Number(e.target.value));
  const handleSkip = (seconds: number) => setCurrentTimeMs((prev) => Math.min(totalDurationMs, Math.max(0, prev + seconds * 1000)));
  const jumpToSubtitle = (item: SubtitleItem) => setCurrentTimeMs(timeStringToMs(item.startTime));

  const handleJumpNext = () => {
    const next = subtitles.find((s) => timeStringToMs(s.startTime) > currentTimeMs);
    if (next) setCurrentTimeMs(timeStringToMs(next.startTime));
  };

  const handleJumpPrev = () => {
    const prevItems = subtitles.filter((s) => timeStringToMs(s.startTime) < currentTimeMs - 500);
    setCurrentTimeMs(prevItems.length > 0 ? timeStringToMs(prevItems[prevItems.length - 1].startTime) : 0);
  };

  const generatedCode = useMemo(() => {
    if (!isOpen || viewMode !== 'code') return '';
    switch (codeFormat) {
      case 'srt':
        return generateFormattedSRT(subtitles, selectedStream === 'dual' ? 'ai' : selectedStream);
      case 'ass':
        return generateASS(subtitles, { fontFamily: urduFont, fontSize: 44, type: selectedStream === 'dual' ? 'ai' : selectedStream, stylingConfig: activeStylingConfig });
      case 'ssa':
        return generateSSA(subtitles, { fontFamily: urduFont, fontSize: 38, type: selectedStream === 'dual' ? 'ai' : selectedStream, stylingConfig: activeStylingConfig });
      case 'vtt':
        return generateWebVTT(subtitles, selectedStream === 'dual' ? 'ai' : selectedStream);
      case 'sbv':
        return generateYouTubeSBV(subtitles, selectedStream === 'dual' ? 'ai' : selectedStream);
      case 'lrc':
        return generateLRC(subtitles, selectedStream === 'dual' ? 'ai' : selectedStream);
      case 'json':
        return generateJSONCaptions(subtitles, selectedStream === 'dual' ? 'ai' : selectedStream);
      default:
        return '';
    }
  }, [isOpen, viewMode, codeFormat, subtitles, selectedStream, urduFont, activeStylingConfig]);

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-2 sm:p-4 bg-black/68 backdrop-touch-lock">
      <div
        className={cn(
          'border rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs w-full anim-pop-in mc-popup mc-role-style',
          isFullScreen ? 'fixed inset-0 h-[100dvh] w-screen rounded-none z-[120]' : 'max-w-[calc(100vw-16px)] sm:max-w-5xl h-[calc(100dvh-20px)] max-h-[880px]'
        )}
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        {/* Header */}
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 mc-popup-header"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Film size={15} style={{ color: 'var(--theme-accent)' }} className="mc-popup-title" />
            <h2 className="font-semibold text-sm truncate mc-popup-title">Preview Studio</h2>
            <InfoPopover
              title="Subtitle Playback Studio"
              description="Simulate subtitle playback in real time across Player, Timeline Tape, and raw Code views for all streams."
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center p-0.5 rounded-lg border" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              {[
                { id: 'player' as const, label: 'Player', icon: Eye },
                { id: 'tape' as const, label: 'Timeline', icon: Clock },
                { id: 'code' as const, label: 'Code', icon: FileCode },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViewMode(m.id)}
                    className={cn('flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold cursor-pointer', viewMode === m.id ? 'text-white' : 'opacity-65 hover:opacity-100')}
                    style={viewMode === m.id ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                  >
                    <Icon size={11} />
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg border opacity-75 hover:opacity-100 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border opacity-75 hover:opacity-100 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Stream & Code Format Strip */}
        <div
          className="px-3.5 py-2 border-b flex items-center justify-between gap-2 flex-wrap shrink-0"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex gap-1 p-0.5 rounded-lg border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
            {[
              { id: 'ai' as const, label: 'AI' },
              { id: 'google' as const, label: 'Google' },
              { id: 'original' as const, label: 'Original' },
              { id: 'dual' as const, label: 'Dual' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStream(s.id)}
                className={cn('px-2.5 py-1 rounded text-[10.5px] font-semibold cursor-pointer', selectedStream === s.id ? 'text-white' : 'opacity-70')}
                style={selectedStream === s.id ? { backgroundColor: 'var(--theme-accent)' } : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>

          {viewMode === 'code' && (
            <div className="flex gap-1 flex-wrap">
              {(['srt', 'ass', 'ssa', 'vtt', 'sbv', 'lrc', 'json'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setCodeFormat(fmt)}
                  className={cn('px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold border cursor-pointer', codeFormat === fmt ? 'text-white border-transparent' : 'opacity-70')}
                  style={codeFormat === fmt ? { backgroundColor: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Stage */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === 'player' && (
            <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 bg-zinc-950">
              <div className="w-full max-w-4xl aspect-video bg-black border border-zinc-800 rounded-xl relative overflow-hidden flex flex-col justify-end p-4 sm:p-8 text-white">
                <div className="absolute top-3 left-3 text-[10px] font-mono text-zinc-400 bg-black/70 px-2 py-0.5 rounded border border-zinc-800 tabular-nums">
                  {msToTimeString(currentTimeMs)} {activeSubtitle ? `· #${activeSubtitle.index}` : ''}
                </div>

                <div className="relative z-10 w-full text-center space-y-2 mb-2">
                  {activeSubtitle ? (
                    <div className="space-y-1.5">
                      {(selectedStream === 'ai' || selectedStream === 'dual') && (
                        <div
                          className="font-urdu leading-relaxed drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]"
                          style={{ fontFamily: urduFont, fontSize: `${Math.max(translatedFontSize, 22)}px` }}
                          dir="rtl"
                          dangerouslySetInnerHTML={{
                            __html: hasFormatting(activeSubtitle.translatedText || '')
                              ? activeSubtitle.translatedText || ''
                              : `<font color="${activeSubtitle.styleColor || '#FFE066'}">${activeSubtitle.translatedText || activeSubtitle.text}</font>`,
                          }}
                        />
                      )}
                      {selectedStream === 'google' && (
                        <div
                          className="font-urdu leading-relaxed drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]"
                          style={{ fontFamily: urduFont, fontSize: `${Math.max(translatedFontSize, 20)}px` }}
                          dir="rtl"
                        >
                          {activeSubtitle.googleTranslateText || activeSubtitle.text}
                        </div>
                      )}
                      {(selectedStream === 'original' || selectedStream === 'dual') && (
                        <div
                          className="font-sans text-sm text-zinc-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-2xl mx-auto"
                          dangerouslySetInnerHTML={hasFormatting(activeSubtitle.text) ? { __html: activeSubtitle.text } : undefined}
                        >
                          {!hasFormatting(activeSubtitle.text) ? activeSubtitle.text : undefined}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-zinc-600 text-[11px] font-mono tabular-nums">
                      [{msToTimeString(currentTimeMs).slice(0, 8)}]
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'tape' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {subtitles.map((sub) => {
                const start = timeStringToMs(sub.startTime);
                const end = timeStringToMs(sub.endTime);
                const isCurrent = currentTimeMs >= start && currentTimeMs <= end;
                return (
                  <div
                    key={sub.index}
                    onClick={() => jumpToSubtitle(sub)}
                    className="p-2.5 rounded-lg border cursor-pointer flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: isCurrent ? 'color-mix(in srgb, var(--theme-accent) 14%, var(--theme-surface))' : 'var(--theme-elevated)',
                      borderColor: isCurrent ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div className="font-mono text-[10px] opacity-75 shrink-0 tabular-nums">
                      #{sub.index} · {sub.startTime}
                    </div>
                    <div className="flex-1 text-right font-urdu text-sm truncate" dir="rtl">
                      {selectedStream === 'google' ? sub.googleTranslateText || sub.text : sub.translatedText || sub.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'code' && (
            <div className="flex-1 overflow-hidden flex flex-col p-3">
              <div className="flex items-center justify-between pb-2">
                <span className="font-mono text-[10px] opacity-70 tabular-nums">
                  .{codeFormat.toUpperCase()} ({subtitles.length})
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded border text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  {copiedCode ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre
                className="flex-1 overflow-auto p-3 rounded-lg border font-mono text-[10.5px] select-text"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                {generatedCode}
              </pre>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div
          className="px-3.5 py-2.5 border-t flex flex-col gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2.5 w-full">
            <span className="font-mono text-[10px] opacity-70 w-14 text-right tabular-nums">
              {msToTimeString(currentTimeMs).slice(3, 11)}
            </span>
            <input
              type="range"
              min="0"
              max={totalDurationMs}
              value={currentTimeMs}
              onChange={handleSeek}
              className="flex-1 cursor-pointer h-1.5 rounded-lg"
              style={{ accentColor: 'var(--theme-accent)' }}
            />
            <span className="font-mono text-[10px] opacity-70 w-14 tabular-nums">
              {msToTimeString(totalDurationMs).slice(3, 11)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSkip(-5)}
                className="px-2 py-1 rounded border font-mono text-[10px] font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                -5s
              </button>
              <button
                type="button"
                onClick={handleJumpPrev}
                className="p-1.5 rounded border cursor-pointer"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={handleJumpNext}
                className="p-1.5 rounded border cursor-pointer"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleSkip(5)}
                className="px-2 py-1 rounded border font-mono text-[10px] font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                +5s
              </button>
              <button
                type="button"
                onClick={() => setCurrentTimeMs(0)}
                className="p-1.5 rounded border opacity-75 hover:opacity-100 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <RotateCcw size={13} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {[0.5, 1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlaybackSpeed(speed)}
                  className={cn('px-2 py-1 rounded text-[10px] font-mono font-semibold border cursor-pointer', playbackSpeed === speed ? 'text-white border-transparent' : 'opacity-70')}
                  style={playbackSpeed === speed ? { backgroundColor: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
