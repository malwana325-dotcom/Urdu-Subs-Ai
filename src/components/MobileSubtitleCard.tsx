import React, { memo, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Languages,
  Loader2,
  Stamp,
  AlertTriangle,
  Undo2,
  Redo2,
} from 'lucide-react';
import { SubtitleItem, calculateDurationAndCPS } from '../utils/srtParser';
import {
  GRADIENT_PALETTES,
  computeSubtitleCssStyles,
  hasFormatting,
  renderStylizedSubtitleHtml,
} from '../utils/subtitleFormatter';
import { ActiveStylingConfig } from './StylingStudioDrawer';
import { SubtitleRowEditableCell } from './SubtitleRowEditableCell';
import { MobileSubtitleView, SubtitleQcIssue } from '../services/appPreferences';
import { detectLineDirection } from './FormattedRichText';
import { cn } from '../utils/cn';

export type WorkspaceStreamField = 'orig' | 'ai' | 'google';

interface MobileSubtitleCardProps {
  item: SubtitleItem;
  viewMode: MobileSubtitleView;
  focusStream?: 'ai' | 'google' | 'original';
  isSelected: boolean;
  onToggleSelect: (index: number) => void;
  onOpenEditor: (index: number) => void;
  onTranslateGoogle: (index: number) => Promise<void> | void;
  visibleColumns: { time: boolean; original: boolean; ai: boolean; google: boolean };
  originalFont: string;
  originalFontSize: number;
  urduFont: string;
  translatedFontSize: number;
  googleFont: string;
  googleFontSize: number;
  isGlobalFontActive: boolean;
  globalFont: string;
  globalFontSize: number;
  activeStylingConfig?: ActiveStylingConfig;
  isStylingPreviewActive: boolean;
  isReadOnly: boolean;
  onEditOriginal: (index: number, text: string) => void;
  onEditTranslated: (index: number, text: string) => void;
  onEditGoogle: (index: number, text: string) => void;
  onOpenWatermark: () => void;
  qcIssue?: SubtitleQcIssue;
  showQcBadges?: boolean;
  canUndoBlock?: boolean;
  canRedoBlock?: boolean;
  onUndoBlock?: (index: number) => void;
  onRedoBlock?: (index: number) => void;
  onLongPressField?: (index: number, field: WorkspaceStreamField, pos: { x: number; y: number }) => void;
  onLongPressColumn?: (field: WorkspaceStreamField, pos: { x: number; y: number }) => void;
  editTriggerTarget?: { index: number; field: WorkspaceStreamField; nonce: number } | null;
}

export const MobileSubtitleCard: React.FC<MobileSubtitleCardProps> = memo(
  ({
    item,
    viewMode,
    focusStream = 'ai',
    isSelected,
    onToggleSelect,
    onOpenEditor,
    onTranslateGoogle,
    visibleColumns,
    originalFont,
    originalFontSize,
    urduFont,
    translatedFontSize,
    googleFont,
    googleFontSize,
    isGlobalFontActive,
    globalFont,
    globalFontSize,
    activeStylingConfig,
    isStylingPreviewActive,
    isReadOnly,
    onEditOriginal,
    onEditTranslated,
    onEditGoogle,
    onOpenWatermark,
    qcIssue,
    showQcBadges = false,
    canUndoBlock = false,
    canRedoBlock = false,
    onUndoBlock,
    onRedoBlock,
    onLongPressField,
    onLongPressColumn,
    editTriggerTarget,
  }) => {
    const [isTranslatingRow, setIsTranslatingRow] = useState(false);
    const [copied, setCopied] = useState(false);

    const colLongPressRef = useRef<{
      timer: ReturnType<typeof setTimeout> | null;
      startX: number;
      startY: number;
    }>({ timer: null, startX: 0, startY: 0 });

    const clearColLongPress = () => {
      if (colLongPressRef.current.timer) {
        clearTimeout(colLongPressRef.current.timer);
        colLongPressRef.current.timer = null;
      }
    };

    const startColLongPress = (
      e: React.TouchEvent<HTMLDivElement>,
      field: WorkspaceStreamField
    ) => {
      if (!onLongPressColumn) return;
      const target = e.target as HTMLElement | null;
      // Only fire column undo/redo menu if touch started outside the text cell itself
      if (target && target.closest('[data-sub-cell="true"], button, input, textarea')) return;
      const t = e.touches[0];
      if (!t) return;
      colLongPressRef.current.startX = t.clientX;
      colLongPressRef.current.startY = t.clientY;
      const pos = { x: t.clientX, y: t.clientY };
      clearColLongPress();
      colLongPressRef.current.timer = setTimeout(() => {
        colLongPressRef.current.timer = null;
        onLongPressColumn(field, pos);
      }, 480);
    };

    const moveColLongPress = (e: React.TouchEvent<HTMLDivElement>) => {
      if (!colLongPressRef.current.timer) return;
      const t = e.touches[0];
      if (!t) return;
      if (
        Math.abs(t.clientX - colLongPressRef.current.startX) > 8 ||
        Math.abs(t.clientY - colLongPressRef.current.startY) > 8
      ) {
        clearColLongPress();
      }
    };

    const localText = item.translatedText || '';

    const timingInfo = useMemo(() => {
      return calculateDurationAndCPS(item.translatedText || item.text, item.startTime, item.endTime);
    }, [item.translatedText, item.text, item.startTime, item.endTime]);

    const origDir = useMemo(() => detectLineDirection(item.text || ''), [item.text]);

    const isRomanOrLatin = useMemo(() => {
      if (!localText) return false;
      const clean = localText.replace(/<[^>]+>|\{[^}]+\}/g, '');
      const urduCount = (clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
      if (urduCount > 0) return false;
      const latinCount = (clean.match(/[a-zA-Z]/g) || []).length;
      return latinCount > 0;
    }, [localText]);

    const isBilingual = useMemo(() => {
      const clean = localText.replace(/<[^>]+>|\{[^}]+\}/g, '');
      return clean.includes('\n') && /[a-zA-Z]/.test(clean) && /[\u0600-\u06FF\u0750-\u077F]/.test(clean);
    }, [localText]);

    const isGoogleRomanOrLatin = useMemo(() => {
      if (!item.googleTranslateText) return false;
      const clean = item.googleTranslateText.replace(/<[^>]+>|\{[^}]+\}/g, '');
      const urduCount = (clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
      if (urduCount > 0) return false;
      const latinCount = (clean.match(/[a-zA-Z]/g) || []).length;
      return latinCount > 0;
    }, [item.googleTranslateText]);

    const shouldStyleOriginal = Boolean(
      isStylingPreviewActive &&
        activeStylingConfig &&
        (activeStylingConfig.targetStreams === 'all' ||
          activeStylingConfig.targetStreams === 'both' ||
          activeStylingConfig.targetStreams === 'original')
    );
    const shouldStyleAi = Boolean(
      isStylingPreviewActive &&
        activeStylingConfig &&
        (activeStylingConfig.targetStreams === 'all' ||
          activeStylingConfig.targetStreams === 'both' ||
          activeStylingConfig.targetStreams === 'translated')
    );
    const shouldStyleGoogle = Boolean(
      isStylingPreviewActive &&
        activeStylingConfig &&
        (activeStylingConfig.targetStreams === 'all' || activeStylingConfig.targetStreams === 'google')
    );

    const hasOriginalFormatting = useMemo(() => hasFormatting(item.text || ''), [item.text]);
    const hasAiFormatting = useMemo(() => hasFormatting(localText), [localText]);
    const hasGoogleFormatting = useMemo(
      () => hasFormatting(item.googleTranslateText || ''),
      [item.googleTranslateText]
    );

    const paletteColors = useMemo(
      () =>
        activeStylingConfig?.customColors ||
        GRADIENT_PALETTES.find((p) => p.id === activeStylingConfig?.paletteId)?.colors,
      [activeStylingConfig]
    );

    const originalCss = useMemo(() => {
      if (!shouldStyleOriginal && !hasOriginalFormatting) return { style: {}, className: '' };
      return computeSubtitleCssStyles({
        ...activeStylingConfig,
        activePaletteColors: paletteColors,
      });
    }, [shouldStyleOriginal, hasOriginalFormatting, activeStylingConfig, paletteColors]);

    const aiCss = useMemo(() => {
      if (!shouldStyleAi && !hasAiFormatting) return { style: {}, className: '' };
      return computeSubtitleCssStyles({
        ...activeStylingConfig,
        activePaletteColors: paletteColors,
      });
    }, [shouldStyleAi, hasAiFormatting, activeStylingConfig, paletteColors]);

    const googleCss = useMemo(() => {
      if (!shouldStyleGoogle && !hasGoogleFormatting) return { style: {}, className: '' };
      return computeSubtitleCssStyles({
        ...activeStylingConfig,
        activePaletteColors: paletteColors,
      });
    }, [shouldStyleGoogle, hasGoogleFormatting, activeStylingConfig, paletteColors]);

    const originalDisplayHtml = useMemo(() => {
      if (hasOriginalFormatting) return item.text;
      if (shouldStyleOriginal && item.text && activeStylingConfig) {
        return renderStylizedSubtitleHtml(
          item.text,
          (item.index || 1) - 1,
          activeStylingConfig.paletteId,
          activeStylingConfig.gradientMode,
          {
            customColors: activeStylingConfig.customColors,
            boldEmphasis: activeStylingConfig.boldEmphasis,
            italicize: activeStylingConfig.italicize,
            transformCase: activeStylingConfig.transformCase,
          }
        );
      }
      return null;
    }, [item.text, item.index, hasOriginalFormatting, shouldStyleOriginal, activeStylingConfig]);

    const aiDisplayHtml = useMemo(() => {
      if (hasAiFormatting) return localText;
      if (shouldStyleAi && localText && activeStylingConfig) {
        return renderStylizedSubtitleHtml(
          localText,
          (item.index || 1) - 1,
          activeStylingConfig.paletteId,
          activeStylingConfig.gradientMode,
          {
            customColors: activeStylingConfig.customColors,
            boldEmphasis: activeStylingConfig.boldEmphasis,
            italicize: activeStylingConfig.italicize,
          }
        );
      }
      return null;
    }, [localText, item.index, hasAiFormatting, shouldStyleAi, activeStylingConfig]);

    const googleDisplayHtml = useMemo(() => {
      if (!item.googleTranslateText) return null;
      if (hasGoogleFormatting) return item.googleTranslateText;
      if (shouldStyleGoogle && activeStylingConfig) {
        return renderStylizedSubtitleHtml(
          item.googleTranslateText,
          (item.index || 1) - 1,
          activeStylingConfig.paletteId,
          activeStylingConfig.gradientMode,
          {
            customColors: activeStylingConfig.customColors,
            boldEmphasis: activeStylingConfig.boldEmphasis,
            italicize: activeStylingConfig.italicize,
          }
        );
      }
      return null;
    }, [item.googleTranslateText, item.index, hasGoogleFormatting, shouldStyleGoogle, activeStylingConfig]);

    const effectiveOriginalFont = isGlobalFontActive
      ? globalFont
      : origDir === 'rtl'
      ? urduFont
      : originalFont;
    const effectiveOriginalSize = isGlobalFontActive ? globalFontSize : originalFontSize;
    const effectiveAiFont = isGlobalFontActive ? globalFont : isRomanOrLatin ? 'inherit' : urduFont;
    const effectiveAiSize = isGlobalFontActive ? globalFontSize : translatedFontSize;
    const effectiveGoogleFont = isGlobalFontActive ? globalFont : isGoogleRomanOrLatin ? 'inherit' : googleFont;
    const effectiveGoogleSize = isGlobalFontActive ? globalFontSize : googleFontSize;

    const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      const clean = (localText || item.googleTranslateText || item.text || '').replace(/<[^>]+>/g, '');
      if (!clean) return;
      navigator.clipboard.writeText(clean);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    };

    const handleTranslateRow = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsTranslatingRow(true);
      try {
        await onTranslateGoogle(item.index);
      } finally {
        setIsTranslatingRow(false);
      }
    };

    const hasQcFlag =
      showQcBadges &&
      qcIssue &&
      (qcIssue.highCps || qcIssue.overlapWithNext || qcIssue.shortDuration || qcIssue.emptyTranslation);

    if (viewMode === 'compact') {
      const preview = (localText || item.text || '').replace(/<[^>]+>/g, '');
      const compactDir = detectLineDirection(preview);
      return (
        <div
          onClick={() => onOpenEditor(item.index)}
          className={cn(
            'perf-row rounded-lg border p-2 flex items-center gap-2 cursor-pointer transition-colors',
            isSelected && 'ring-1 ring-[var(--theme-accent)]'
          )}
          style={{
            backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(item.index)}
            onClick={(e) => e.stopPropagation()}
            className="rounded w-3.5 h-3.5 shrink-0 cursor-pointer"
            aria-label={`Select line #${item.index}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-60 tabular-nums">
              <span className="font-semibold">#{item.index}</span>
              <span>·</span>
              <span>{item.startTime.slice(0, 8)}</span>
              <span>·</span>
              <span className={timingInfo.cps > 25 ? 'text-red-500 font-semibold' : ''}>{timingInfo.cps} cps</span>
            </div>
            <p
              className={cn(
                'text-xs truncate mt-0.5',
                compactDir === 'rtl' ? 'font-urdu text-right' : 'text-left'
              )}
              dir={compactDir}
            >
              {preview || '—'}
            </p>
          </div>
          <Edit3 size={13} className="opacity-55 shrink-0" />
        </div>
      );
    }

    return (
      <div
        className={cn(
          'perf-row rounded-lg border transition-colors space-y-1.5 p-2',
          item.index === 1 && 'border-l-2 border-l-amber-500',
          isSelected && 'ring-1 ring-[var(--theme-accent)]'
        )}
        style={{
          backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.index)}
              className="rounded w-3.5 h-3.5 cursor-pointer shrink-0"
              aria-label={`Select subtitle #${item.index}`}
            />
            <span className="font-mono text-[11px] font-semibold tabular-nums">#{item.index}</span>
            {visibleColumns.time && (
              <span className="font-mono text-[10px] opacity-60 tabular-nums truncate">
                {item.startTime.slice(0, 8)} → {item.endTime.slice(0, 8)} · {timingInfo.durationSec}s ·{' '}
                <span className={timingInfo.cps > 25 ? 'text-red-500 font-semibold' : ''}>{timingInfo.cps} cps</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onUndoBlock && (
              <button
                type="button"
                onClick={() => onUndoBlock(item.index)}
                disabled={!canUndoBlock}
                className="h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer disabled:opacity-30"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title="Undo block edit"
              >
                <Undo2 size={12} />
              </button>
            )}
            {onRedoBlock && (
              <button
                type="button"
                onClick={() => onRedoBlock(item.index)}
                disabled={!canRedoBlock}
                className="h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer disabled:opacity-30"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title="Redo block edit"
              >
                <Redo2 size={12} />
              </button>
            )}
            {item.index === 1 && (
              <button
                type="button"
                onClick={onOpenWatermark}
                className="h-7 px-2 rounded-md border text-amber-500 border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)' }}
                title="Edit watermark"
              >
                <Stamp size={11} />
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              title="Copy"
            >
              {copied ? <Check size={12} style={{ color: 'var(--theme-accent)' }} /> : <Copy size={12} />}
            </button>
            <button
              type="button"
              onClick={() => onOpenEditor(item.index)}
              className="h-7 px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <Edit3 size={11} style={{ color: 'var(--theme-accent)' }} />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {hasQcFlag && qcIssue && (
          <div className="flex items-center gap-1 flex-wrap text-[10px] font-medium">
            {qcIssue.highCps && (
              <span className="inline-flex items-center gap-1 text-red-500">
                <AlertTriangle size={10} /> CPS {qcIssue.cps}
              </span>
            )}
            {qcIssue.overlapWithNext && <span className="text-amber-500">· Overlap</span>}
            {qcIssue.shortDuration && <span className="text-amber-500">· Short ({qcIssue.durationSec}s)</span>}
            {qcIssue.emptyTranslation && <span className="opacity-65">· Untranslated</span>}
          </div>
        )}

        {((viewMode === 'cards' && visibleColumns.original) ||
          (viewMode === 'stream-switch' &&
            (focusStream === 'original' || focusStream === 'ai' || focusStream === 'google'))) && (
          <div
            onTouchStart={(e) => startColLongPress(e, 'orig')}
            onTouchMove={moveColLongPress}
            onTouchEnd={clearColLongPress}
            onTouchCancel={clearColLongPress}
            onContextMenu={(e) => {
              const target = e.target as HTMLElement | null;
              if (target && target.closest('[data-sub-cell="true"]')) return;
              if (onLongPressColumn) {
                e.preventDefault();
                onLongPressColumn('orig', { x: e.clientX, y: e.clientY });
              }
            }}
            className="rounded-md border px-1.5 py-1.5"
            style={{
              backgroundColor: 'var(--theme-elevated)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <div className="text-[9px] font-semibold uppercase tracking-wider opacity-50 mb-0.5 flex items-center justify-between px-0.5">
              <span>Original</span>
              <span className="font-mono opacity-60">{(item.text || '').length}c</span>
            </div>
            <div data-sub-cell="true" className="w-full">
              <SubtitleRowEditableCell
                value={item.text || ''}
                isReadOnly={isReadOnly || (viewMode === 'stream-switch' && focusStream !== 'original')}
                onCommit={(newText) => onEditOriginal(item.index, newText)}
                fontFamily={effectiveOriginalFont}
                fontSize={effectiveOriginalSize}
                dir={origDir}
                className={cn(origDir === 'rtl' ? 'font-urdu text-right' : 'text-left', originalCss.className)}
                style={originalCss.style}
                displayHtml={originalDisplayHtml}
                placeholder="Source..."
                emptyLabel="—"
                horizontalGrid={false}
                onLongPress={
                  onLongPressField
                    ? (pos) => onLongPressField(item.index, 'orig', pos)
                    : undefined
                }
                editTriggerNonce={
                  editTriggerTarget?.index === item.index && editTriggerTarget.field === 'orig'
                    ? editTriggerTarget.nonce
                    : undefined
                }
              />
            </div>
          </div>
        )}

        {((viewMode === 'cards' && visibleColumns.ai) || (viewMode === 'stream-switch' && focusStream === 'ai')) && (
          <div
            onTouchStart={(e) => startColLongPress(e, 'ai')}
            onTouchMove={moveColLongPress}
            onTouchEnd={clearColLongPress}
            onTouchCancel={clearColLongPress}
            onContextMenu={(e) => {
              const target = e.target as HTMLElement | null;
              if (target && target.closest('[data-sub-cell="true"]')) return;
              if (onLongPressColumn) {
                e.preventDefault();
                onLongPressColumn('ai', { x: e.clientX, y: e.clientY });
              }
            }}
            className="rounded-md border px-1.5 py-1.5"
            style={{
              backgroundColor: 'var(--theme-elevated)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider opacity-55 mb-0.5 px-0.5">
              <span>AI</span>
              {localText && <span className="font-mono tabular-nums">{localText.replace(/<[^>]+>/g, '').length}c</span>}
            </div>
            <div data-sub-cell="true" className="w-full">
              <SubtitleRowEditableCell
                value={localText}
                isReadOnly={isReadOnly}
                onCommit={(newText) => onEditTranslated(item.index, newText)}
                fontFamily={effectiveAiFont}
                fontSize={effectiveAiSize}
                dir={isBilingual ? 'auto' : isRomanOrLatin ? 'ltr' : 'rtl'}
                className={cn(isRomanOrLatin ? 'text-left font-sans' : 'text-right font-urdu', aiCss.className)}
                style={aiCss.style}
                displayHtml={aiDisplayHtml}
                placeholder="ترجمہ..."
                emptyLabel="—"
                horizontalGrid={false}
                onLongPress={
                  onLongPressField
                    ? (pos) => onLongPressField(item.index, 'ai', pos)
                    : undefined
                }
                editTriggerNonce={
                  editTriggerTarget?.index === item.index && editTriggerTarget.field === 'ai'
                    ? editTriggerTarget.nonce
                    : undefined
                }
              />
            </div>
          </div>
        )}

        {((viewMode === 'cards' && visibleColumns.google) ||
          (viewMode === 'stream-switch' && focusStream === 'google')) && (
          <div
            onTouchStart={(e) => startColLongPress(e, 'google')}
            onTouchMove={moveColLongPress}
            onTouchEnd={clearColLongPress}
            onTouchCancel={clearColLongPress}
            onContextMenu={(e) => {
              const target = e.target as HTMLElement | null;
              if (target && target.closest('[data-sub-cell="true"]')) return;
              if (onLongPressColumn) {
                e.preventDefault();
                onLongPressColumn('google', { x: e.clientX, y: e.clientY });
              }
            }}
            className="rounded-md border px-1.5 py-1.5"
            style={{
              backgroundColor: 'var(--theme-elevated)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider opacity-55 mb-0.5 px-0.5">
              <span>Neutral / Google</span>
              {(!item.googleTranslateText || item.googleTranslateText === 'Translation Error') && (
                <button
                  type="button"
                  onClick={handleTranslateRow}
                  disabled={isTranslatingRow}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[9px] font-semibold cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                >
                  {isTranslatingRow ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />}
                  <span>Translate</span>
                </button>
              )}
            </div>
            <div data-sub-cell="true" className="w-full">
              <SubtitleRowEditableCell
                value={item.googleTranslateText || ''}
                isReadOnly={isReadOnly}
                onCommit={(newText) => onEditGoogle(item.index, newText)}
                fontFamily={effectiveGoogleFont}
                fontSize={effectiveGoogleSize}
                dir={item.googleTranslateText ? (isGoogleRomanOrLatin ? 'ltr' : 'rtl') : 'rtl'}
                className={cn(
                  isGoogleRomanOrLatin ? 'text-left font-sans' : 'text-right font-urdu',
                  googleCss.className
                )}
                style={googleCss.style}
                displayHtml={googleDisplayHtml}
                placeholder="Neutral / Google..."
                emptyLabel="—"
                horizontalGrid={false}
                onLongPress={
                  onLongPressField
                    ? (pos) => onLongPressField(item.index, 'google', pos)
                    : undefined
                }
                editTriggerNonce={
                  editTriggerTarget?.index === item.index && editTriggerTarget.field === 'google'
                    ? editTriggerTarget.nonce
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

MobileSubtitleCard.displayName = 'MobileSubtitleCard';
