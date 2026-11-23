import React, { useState } from 'react';
import {
  Palette,
  Stamp,
  Check,
  Type,
  Upload,
  Globe,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { ActiveStylingConfig } from './StylingStudioDrawer';
import { GRADIENT_PALETTES } from '../utils/subtitleFormatter';
import { SubtitleItem } from '../utils/srtParser';
import {
  URDU_FONT_OPTIONS,
  ENGLISH_FONT_OPTIONS,
  CustomFontItem,
} from '../constants/fonts';
import { StickyStylingPreview } from './StickyStylingPreview';
import { InfoPopover } from './InfoPopover';
import { cn } from '../utils/cn';

interface StylingTabViewProps {
  subtitles: SubtitleItem[];
  subtitlesCount: number;
  activeStylingConfig: ActiveStylingConfig;
  onOpenStylingDrawer: () => void;
  onOpenWatermark: () => void;
  onBakeAllStyles: () => void;
  urduFont: string;
  originalFont: string;
  googleFont: string;
  globalFont: string;
  isGlobalFontActive: boolean;
  translatedFontSize: number;
  originalFontSize: number;
  googleFontSize: number;
  globalFontSize: number;
  localFonts: CustomFontItem[];
  isUploadingFont: boolean;
  onUpdateUrduFont: (val: string) => void;
  onUpdateOriginalFont: (val: string) => void;
  onUpdateGoogleFont: (val: string) => void;
  onUpdateGlobalFont: (val: string) => void;
  onToggleGlobalFont: (active: boolean) => void;
  onUpdateTranslatedFontSize: (val: number) => void;
  onUpdateOriginalFontSize: (val: number) => void;
  onUpdateGoogleFontSize: (val: number) => void;
  onUpdateGlobalFontSize: (val: number) => void;
  onUploadFontFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StylingTabView: React.FC<StylingTabViewProps> = ({
  subtitles,
  subtitlesCount,
  activeStylingConfig,
  onOpenStylingDrawer,
  onOpenWatermark,
  onBakeAllStyles,
  urduFont,
  originalFont,
  googleFont,
  globalFont,
  isGlobalFontActive,
  translatedFontSize,
  originalFontSize,
  googleFontSize,
  globalFontSize,
  localFonts,
  isUploadingFont,
  onUpdateUrduFont,
  onUpdateOriginalFont,
  onUpdateGoogleFont,
  onUpdateGlobalFont,
  onToggleGlobalFont,
  onUpdateTranslatedFontSize,
  onUpdateOriginalFontSize,
  onUpdateGoogleFontSize,
  onUpdateGlobalFontSize,
  onUploadFontFile,
}) => {
  const [fontTab, setFontTab] = useState<'urdu' | 'english' | 'local'>('urdu');
  const [streamTarget, setStreamTarget] = useState<'ai' | 'original' | 'google' | 'global'>(
    isGlobalFontActive ? 'global' : 'ai'
  );

  const activePalette = GRADIENT_PALETTES.find((p) => p.id === activeStylingConfig.paletteId);
  const paletteColors = activeStylingConfig.customColors || activePalette?.colors || ['#14b8a6', '#38bdf8'];

  const handleSelectFont = (val: string) => {
    if (streamTarget === 'global') {
      onToggleGlobalFont(true);
      onUpdateGlobalFont(val);
      onUpdateUrduFont(val);
      onUpdateOriginalFont(val);
      onUpdateGoogleFont(val);
    } else if (streamTarget === 'ai') {
      onToggleGlobalFont(false);
      onUpdateUrduFont(val);
    } else if (streamTarget === 'original') {
      onToggleGlobalFont(false);
      onUpdateOriginalFont(val);
    } else {
      onToggleGlobalFont(false);
      onUpdateGoogleFont(val);
    }
  };

  const currentSelectedFont =
    streamTarget === 'global'
      ? globalFont
      : streamTarget === 'ai'
      ? urduFont
      : streamTarget === 'original'
      ? originalFont
      : googleFont;

  const fontList =
    fontTab === 'urdu'
      ? URDU_FONT_OPTIONS
      : fontTab === 'english'
      ? ENGLISH_FONT_OPTIONS
      : localFonts;

  const handleResetSizesToDefault = () => {
    onUpdateTranslatedFontSize(16);
    onUpdateOriginalFontSize(16);
    onUpdateGoogleFontSize(16);
    onUpdateGlobalFontSize(16);
  };

  return (
    <div className="space-y-3 max-w-5xl mx-auto w-full pb-16">
      <StickyStylingPreview
        subtitles={subtitles}
        urduFont={isGlobalFontActive ? globalFont : urduFont}
        originalFont={isGlobalFontActive ? globalFont : originalFont}
        googleFont={isGlobalFontActive ? globalFont : googleFont}
        translatedFontSize={isGlobalFontActive ? globalFontSize : translatedFontSize}
        originalFontSize={isGlobalFontActive ? globalFontSize : originalFontSize}
        googleFontSize={isGlobalFontActive ? globalFontSize : googleFontSize}
        activeStylingConfig={activeStylingConfig}
      />

      {/* Gradient Studio & Watermark */}
      <div
        className="rounded-xl border space-y-2.5 theme-card"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Palette size={15} style={{ color: 'var(--theme-accent)' }} />
            <h2 className="text-xs sm:text-sm font-semibold truncate">Styling Studio</h2>
            <InfoPopover
              title="Subtitle Styling Studio"
              description="Swipe left from the right edge or tap Gradient to open the Gradient Studio drawer. Preview live in the 16:9 simulator above."
              align="left"
            />
          </div>

          <button
            type="button"
            onClick={onOpenStylingDrawer}
            className="flex items-center gap-2 shrink-0 px-2 py-1 rounded-lg border cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: 'var(--theme-elevated)',
              borderColor: 'var(--theme-border)',
            }}
            title="Open Gradient Studio drawer"
          >
            <span
              className="h-3.5 w-10 rounded border border-white/15 shrink-0"
              style={{ background: `linear-gradient(90deg, ${paletteColors.join(', ')})` }}
            />
            <span className="text-[11px] opacity-75 font-mono truncate max-w-[140px]">
              {activePalette?.name || 'Custom'} · {activeStylingConfig.targetStreams}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenStylingDrawer}
              className="min-h-[36px] px-3 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Sliders size={13} className="shrink-0" />
              <span className="truncate">Gradient</span>
            </button>

            <button
              type="button"
              onClick={onOpenWatermark}
              disabled={subtitlesCount === 0}
              className="min-h-[36px] px-3 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer touch-tactile btn-inch-cap"
              style={{
                backgroundColor: 'var(--theme-elevated)',
                borderColor: 'var(--theme-border)',
              }}
            >
              <Stamp size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="truncate">Watermark</span>
            </button>
          </div>

          <span className="text-[10px] opacity-55">
            Swipe left from right edge for Gradient Studio
          </span>
        </div>
      </div>

      {/* Text Scale */}
      <div
        className="rounded-xl border space-y-2.5 theme-card"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Type size={14} style={{ color: 'var(--theme-accent)' }} />
            <h3 className="text-xs sm:text-sm font-semibold">Text Scale</h3>
            <InfoPopover
              title="Uniform Stream Scale"
              description="All streams default to 16px (10px–48px range)."
              align="left"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetSizesToDefault}
              className="min-h-[30px] px-2 rounded-md border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-elevated)',
                borderColor: 'var(--theme-border)',
              }}
            >
              <RotateCcw size={11} />
              <span>16px</span>
            </button>
            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isGlobalFontActive}
                onChange={(e) => {
                  onToggleGlobalFont(e.target.checked);
                  if (e.target.checked) setStreamTarget('global');
                }}
                className="rounded w-3.5 h-3.5"
              />
              <Globe size={12} />
              <span>Sync</span>
            </label>
          </div>
        </div>

        {isGlobalFontActive ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">All Streams</span>
              <span className="font-mono font-semibold tabular-nums">{globalFontSize}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={48}
              value={globalFontSize}
              onChange={(e) => onUpdateGlobalFontSize(Number(e.target.value))}
              className="w-full cursor-pointer h-1.5"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">AI Urdu</span>
                <span className="font-mono font-semibold tabular-nums">{translatedFontSize}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={48}
                value={translatedFontSize}
                onChange={(e) => onUpdateTranslatedFontSize(Number(e.target.value))}
                className="w-full cursor-pointer h-1.5"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Original</span>
                <span className="font-mono font-semibold tabular-nums">{originalFontSize}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={48}
                value={originalFontSize}
                onChange={(e) => onUpdateOriginalFontSize(Number(e.target.value))}
                className="w-full cursor-pointer h-1.5"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Google</span>
                <span className="font-mono font-semibold tabular-nums">{googleFontSize}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={48}
                value={googleFontSize}
                onChange={(e) => onUpdateGoogleFontSize(Number(e.target.value))}
                className="w-full cursor-pointer h-1.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Typeface Picker */}
      <div
        className="rounded-xl border space-y-2.5 theme-card"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs sm:text-sm font-semibold">Fonts</h3>
            <InfoPopover
              title="Stream Fonts"
              description="Choose fonts per stream or globally across all streams."
              align="left"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {(
              [
                { id: 'ai', label: 'AI' },
                { id: 'original', label: 'Orig' },
                { id: 'google', label: 'Google' },
                { id: 'global', label: 'All' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setStreamTarget(t.id)}
                className={cn(
                  'min-h-[30px] px-2.5 rounded-md text-[11px] font-semibold border cursor-pointer',
                  streamTarget === t.id ? 'text-white' : 'opacity-75'
                )}
                style={
                  streamTarget === t.id
                    ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                    : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'urdu', label: `Urdu (${URDU_FONT_OPTIONS.length})` },
              { id: 'english', label: `Eng (${ENGLISH_FONT_OPTIONS.length})` },
              { id: 'local', label: `Local (${localFonts.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFontTab(tab.id)}
              className={cn(
                'min-h-[32px] px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer btn-inch-cap',
                fontTab === tab.id ? 'text-white' : 'opacity-75'
              )}
              style={
                fontTab === tab.id
                  ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                  : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
              }
            >
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {fontTab === 'local' && (
          <label
            className="min-h-[36px] px-3 rounded-lg border border-dashed inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer btn-inch-cap"
            style={{
              backgroundColor: 'var(--theme-elevated)',
              borderColor: 'var(--theme-accent)',
            }}
          >
            <Upload size={13} className="shrink-0" />
            <span className="truncate">{isUploadingFont ? 'Loading...' : 'Upload'}</span>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2,font/*"
              onChange={onUploadFontFile}
              className="hidden"
              disabled={isUploadingFont}
            />
          </label>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-0.5">
          {fontList.map((font) => {
            const isActive = currentSelectedFont === font.value;
            return (
              <button
                key={'id' in font ? font.id : font.name}
                type="button"
                onClick={() => handleSelectFont(font.value)}
                className="p-2.5 rounded-lg border text-left transition-colors cursor-pointer space-y-0.5"
                style={{
                  backgroundColor: isActive ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                  borderColor: isActive ? 'var(--theme-accent)' : 'var(--theme-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold truncate">{font.name}</span>
                  {isActive && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                </div>
                <p
                  className={cn('text-xs truncate', fontTab === 'urdu' ? 'font-urdu text-right' : '')}
                  dir={fontTab === 'urdu' ? 'rtl' : 'ltr'}
                  style={{ fontFamily: font.value }}
                >
                  {'previewText' in font && font.previewText ? font.previewText : 'ہر بات میں ایک گہرا احساس چھپا ہے'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slim Pinned Apply Bar */}
      <div
        className="sticky bottom-[60px] lg:bottom-3 z-20 rounded-xl border px-3 py-2 shadow-lg flex items-center justify-between gap-2"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <span className="text-xs font-mono tabular-nums opacity-75 truncate">
          {subtitlesCount} lines
        </span>
        <button
          type="button"
          onClick={onBakeAllStyles}
          disabled={subtitlesCount === 0}
          className="min-h-[36px] px-3 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 touch-tactile btn-inch-cap"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          <Check size={14} className="shrink-0" />
          <span className="truncate">Apply</span>
        </button>
      </div>
    </div>
  );
};
