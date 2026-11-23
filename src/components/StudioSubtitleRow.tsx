import React, { memo, useEffect, useRef, useState } from 'react';
import { Trash2, Undo2, Redo2 } from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import { detectLineDirection } from './FormattedRichText';
import { cn } from '../utils/cn';

export type StudioStreamField = 'orig' | 'ai' | 'google';

export interface StudioSubtitleRowProps {
  item: SubtitleItem;
  showTime: boolean;
  activeStream: StudioStreamField;
  effectiveOriginalFont: string;
  effectiveOriginalSize: number;
  effectiveAiFont: string;
  effectiveAiSize: number;
  effectiveGoogleFont: string;
  effectiveGoogleSize: number;
  isLastEdited?: boolean;
  canUndoBlock?: boolean;
  canRedoBlock?: boolean;
  onUndoBlock?: (index: number) => void;
  onRedoBlock?: (index: number) => void;
  onEditOriginal: (index: number, newText: string) => void;
  onEditTranslated: (index: number, newText: string) => void;
  onEditGoogle: (index: number, newText: string) => void;
  onDeleteRow: (index: number) => void;
  onMarkDirty: (index: number) => void;
  onTextActivity?: (index: number) => void;
  onFocusField?: (index: number, field: StudioStreamField, el: HTMLTextAreaElement) => void;
  onDoubleEnterSaveAdvance?: (index: number, field: StudioStreamField, currentValue: string) => void;
  registerInputRef?: (index: number, field: StudioStreamField, el: HTMLTextAreaElement | null) => void;
  setRowRef: (index: number, el: HTMLDivElement | null) => void;
}

export const StudioSubtitleRow = memo(
  ({
    item,
    showTime,
    activeStream,
    effectiveOriginalFont,
    effectiveOriginalSize,
    effectiveAiFont,
    effectiveAiSize,
    effectiveGoogleFont,
    effectiveGoogleSize,
    isLastEdited = false,
    canUndoBlock = false,
    canRedoBlock = false,
    onUndoBlock,
    onRedoBlock,
    onEditOriginal,
    onEditTranslated,
    onEditGoogle,
    onDeleteRow,
    onMarkDirty,
    onTextActivity,
    onFocusField,
    onDoubleEnterSaveAdvance,
    registerInputRef,
    setRowRef,
  }: StudioSubtitleRowProps) => {
    const [origText, setOrigText] = useState(item.text || '');
    const [aiText, setAiText] = useState(item.translatedText || '');
    const [googleText, setGoogleText] = useState(item.googleTranslateText || '');

    const focusedFieldRef = useRef<StudioStreamField | null>(null);
    const pendingEnterRef = useRef<{
      field: StudioStreamField | null;
      time: number;
      timer: ReturnType<typeof setTimeout> | null;
    }>({
      field: null,
      time: 0,
      timer: null,
    });
    const debounceTimersRef = useRef<{
      orig?: ReturnType<typeof setTimeout>;
      ai?: ReturnType<typeof setTimeout>;
      google?: ReturnType<typeof setTimeout>;
    }>({});

    useEffect(() => {
      if (focusedFieldRef.current !== 'orig' || origText !== (item.text || '')) {
        setOrigText(item.text || '');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.index, item.text]);

    useEffect(() => {
      if (focusedFieldRef.current !== 'ai' || aiText !== (item.translatedText || '')) {
        setAiText(item.translatedText || '');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.index, item.translatedText]);

    useEffect(() => {
      if (focusedFieldRef.current !== 'google' || googleText !== (item.googleTranslateText || '')) {
        setGoogleText(item.googleTranslateText || '');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.index, item.googleTranslateText]);

    useEffect(() => {
      const timers = debounceTimersRef.current;
      const pendingEnter = pendingEnterRef.current;
      return () => {
        if (timers.orig) clearTimeout(timers.orig);
        if (timers.ai) clearTimeout(timers.ai);
        if (timers.google) clearTimeout(timers.google);
        if (pendingEnter.timer) clearTimeout(pendingEnter.timer);
      };
    }, []);

    const clearPendingEnter = () => {
      if (pendingEnterRef.current.timer) {
        clearTimeout(pendingEnterRef.current.timer);
      }
      pendingEnterRef.current = { field: null, time: 0, timer: null };
    };

    const handleOrigChange = (val: string) => {
      setOrigText(val);
      onTextActivity?.(item.index);
      if (val !== (item.text || '')) {
        onMarkDirty(item.index);
        if (debounceTimersRef.current.orig) clearTimeout(debounceTimersRef.current.orig);
        debounceTimersRef.current.orig = setTimeout(() => onEditOriginal(item.index, val), 140);
      }
    };

    const handleAiChange = (val: string) => {
      setAiText(val);
      onTextActivity?.(item.index);
      if (val !== (item.translatedText || '')) {
        onMarkDirty(item.index);
        if (debounceTimersRef.current.ai) clearTimeout(debounceTimersRef.current.ai);
        debounceTimersRef.current.ai = setTimeout(() => onEditTranslated(item.index, val), 140);
      }
    };

    const handleGoogleChange = (val: string) => {
      setGoogleText(val);
      onTextActivity?.(item.index);
      if (val !== (item.googleTranslateText || '')) {
        onMarkDirty(item.index);
        if (debounceTimersRef.current.google) clearTimeout(debounceTimersRef.current.google);
        debounceTimersRef.current.google = setTimeout(() => onEditGoogle(item.index, val), 140);
      }
    };

    const insertNewlineAtCaret = (
      el: HTMLTextAreaElement,
      field: StudioStreamField,
      val: string
    ) => {
      const start = el.selectionStart ?? val.length;
      const end = el.selectionEnd ?? val.length;
      const nextVal = val.slice(0, start) + '\n' + val.slice(end);
      if (field === 'orig') handleOrigChange(nextVal);
      else if (field === 'ai') handleAiChange(nextVal);
      else handleGoogleChange(nextVal);
      requestAnimationFrame(() => {
        if (document.contains(el)) {
          el.setSelectionRange(start + 1, start + 1);
        }
      });
    };

    const handleStreamKeyDown = (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
      field: StudioStreamField,
      currentValue: string
    ) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Prevent immediate newline DOM insertion so double-tap never bounces cursor or triggers lag
        e.preventDefault();
        const now = Date.now();
        const el = e.currentTarget;
        const isDoubleTap =
          pendingEnterRef.current.field === field &&
          now - pendingEnterRef.current.time <= 360;

        if (isDoubleTap) {
          clearPendingEnter();
          const timers = debounceTimersRef.current;
          if (timers[field]) clearTimeout(timers[field]);
          onDoubleEnterSaveAdvance?.(item.index, field, currentValue);
        } else {
          clearPendingEnter();
          const timer = setTimeout(() => {
            pendingEnterRef.current = { field: null, time: 0, timer: null };
            insertNewlineAtCaret(el, field, currentValue);
          }, 230);
          pendingEnterRef.current = { field, time: now, timer };
        }
      } else if (e.key !== 'Enter') {
        clearPendingEnter();
      }
    };

    const origDir = detectLineDirection(origText);
    const aiDir = detectLineDirection(aiText);
    const googleDir = detectLineDirection(googleText);

    return (
      <div
        ref={(el) => setRowRef(item.index, el)}
        className={cn(
          'border-b px-3 py-2 flex flex-col gap-1.5 transition-colors',
          isLastEdited && 'border-l-4 border-l-[var(--theme-accent)]'
        )}
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: isLastEdited ? 'var(--theme-accent-soft)' : 'transparent',
        }}
      >
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold opacity-80">#{item.index}</span>
            {showTime && (
              <span className="tabular-nums opacity-60 truncate">
                {item.startTime.slice(0, 8)} → {item.endTime.slice(0, 8)}
              </span>
            )}
            {isLastEdited && (
              <span
                className="text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--theme-accent)', color: '#ffffff' }}
              >
                Edited
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onUndoBlock && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onUndoBlock(item.index)}
                disabled={!canUndoBlock}
                className="w-7 h-7 rounded border flex items-center justify-center cursor-pointer disabled:opacity-25"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title={`Undo edits on #${item.index}`}
                aria-label={`Undo #${item.index}`}
              >
                <Undo2 size={11} />
              </button>
            )}
            {onRedoBlock && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onRedoBlock(item.index)}
                disabled={!canRedoBlock}
                className="w-7 h-7 rounded border flex items-center justify-center cursor-pointer disabled:opacity-25"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title={`Redo edits on #${item.index}`}
                aria-label={`Redo #${item.index}`}
              >
                <Redo2 size={11} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDeleteRow(item.index)}
              className="w-7 h-7 rounded flex items-center justify-center hover:text-red-500 cursor-pointer opacity-70 hover:opacity-100"
              title={`Delete line #${item.index}`}
              aria-label={`Delete #${item.index}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Single Active Stream Box */}
        <div>
          {activeStream === 'orig' && (
            <textarea
              ref={(el) => registerInputRef?.(item.index, 'orig', el)}
              value={origText}
              onFocus={(e) => {
                focusedFieldRef.current = 'orig';
                onFocusField?.(item.index, 'orig', e.currentTarget);
              }}
              onChange={(e) => handleOrigChange(e.target.value)}
              onKeyDown={(e) => handleStreamKeyDown(e, 'orig', origText)}
              onBlur={() => {
                clearPendingEnter();
                focusedFieldRef.current = null;
                if (debounceTimersRef.current.orig) clearTimeout(debounceTimersRef.current.orig);
                if (origText !== (item.text || '')) onEditOriginal(item.index, origText);
              }}
              placeholder="Source dialogue... (Enter×2: Save & Next)"
              rows={3}
              dir={origDir}
              className={cn(
                'w-full leading-[1.55] border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] resize-none overflow-y-auto overscroll-auto',
                origDir === 'rtl' ? 'text-right font-urdu' : 'text-left font-sans'
              )}
              style={{
                fontSize: `${effectiveOriginalSize}px`,
                fontFamily: origDir === 'rtl' ? effectiveAiFont : effectiveOriginalFont,
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            />
          )}

          {activeStream === 'ai' && (
            <textarea
              ref={(el) => registerInputRef?.(item.index, 'ai', el)}
              value={aiText}
              onFocus={(e) => {
                focusedFieldRef.current = 'ai';
                onFocusField?.(item.index, 'ai', e.currentTarget);
              }}
              onChange={(e) => handleAiChange(e.target.value)}
              onKeyDown={(e) => handleStreamKeyDown(e, 'ai', aiText)}
              onBlur={() => {
                clearPendingEnter();
                focusedFieldRef.current = null;
                if (debounceTimersRef.current.ai) clearTimeout(debounceTimersRef.current.ai);
                if (aiText !== (item.translatedText || '')) onEditTranslated(item.index, aiText);
              }}
              placeholder="AI ترجمہ... (Enter×2: Save & Next)"
              rows={3}
              dir={aiDir}
              className={cn(
                'w-full leading-[1.7] border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] resize-none overflow-y-auto overscroll-auto',
                aiDir === 'rtl' ? 'text-right font-urdu' : 'text-left font-sans'
              )}
              style={{
                fontSize: `${effectiveAiSize}px`,
                fontFamily: aiDir === 'ltr' ? 'inherit' : effectiveAiFont,
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            />
          )}

          {activeStream === 'google' && (
            <textarea
              ref={(el) => registerInputRef?.(item.index, 'google', el)}
              value={googleText}
              onFocus={(e) => {
                focusedFieldRef.current = 'google';
                onFocusField?.(item.index, 'google', e.currentTarget);
              }}
              onChange={(e) => handleGoogleChange(e.target.value)}
              onKeyDown={(e) => handleStreamKeyDown(e, 'google', googleText)}
              onBlur={() => {
                clearPendingEnter();
                focusedFieldRef.current = null;
                if (debounceTimersRef.current.google) clearTimeout(debounceTimersRef.current.google);
                if (googleText !== (item.googleTranslateText || '')) onEditGoogle(item.index, googleText);
              }}
              placeholder="Neutral / Google... (Enter×2: Save & Next)"
              rows={3}
              dir={googleDir}
              className={cn(
                'w-full leading-[1.7] border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] resize-none overflow-y-auto overscroll-auto',
                googleDir === 'rtl' ? 'text-right font-urdu' : 'text-left font-sans'
              )}
              style={{
                fontSize: `${effectiveGoogleSize}px`,
                fontFamily: googleDir === 'ltr' ? 'inherit' : effectiveGoogleFont,
                backgroundColor: 'var(--theme-elevated)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            />
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    if (
      prev.showTime !== next.showTime ||
      prev.activeStream !== next.activeStream ||
      prev.isLastEdited !== next.isLastEdited ||
      prev.canUndoBlock !== next.canUndoBlock ||
      prev.canRedoBlock !== next.canRedoBlock ||
      prev.effectiveOriginalFont !== next.effectiveOriginalFont ||
      prev.effectiveOriginalSize !== next.effectiveOriginalSize ||
      prev.effectiveAiFont !== next.effectiveAiFont ||
      prev.effectiveAiSize !== next.effectiveAiSize ||
      prev.effectiveGoogleFont !== next.effectiveGoogleFont ||
      prev.effectiveGoogleSize !== next.effectiveGoogleSize
    ) {
      return false;
    }

    const p = prev.item;
    const n = next.item;
    return (
      p.index === n.index &&
      p.text === n.text &&
      p.translatedText === n.translatedText &&
      p.googleTranslateText === n.googleTranslateText &&
      p.startTime === n.startTime &&
      p.endTime === n.endTime
    );
  }
);

StudioSubtitleRow.displayName = 'StudioSubtitleRow';
