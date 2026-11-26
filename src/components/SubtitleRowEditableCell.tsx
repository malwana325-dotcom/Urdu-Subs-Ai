import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '../utils/cn';
import { detectLineDirection } from './FormattedRichText';
import {
  formatSubtitlePreview,
  hasFormatting,
  reapplyFormattingTemplate,
  toCleanEditableText,
} from '../utils/subtitleFormatter';

interface SubtitleRowEditableCellProps {
  value: string;
  isReadOnly: boolean;
  onCommit: (newValue: string) => void;
  fontFamily: string;
  fontSize: number;
  dir?: 'ltr' | 'rtl' | 'auto';
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  displayHtml?: string | null;
  emptyLabel?: string;
  horizontalGrid?: boolean;
  onLongPress?: (pos: { x: number; y: number }) => void;
  editTriggerNonce?: number;
}

export const SubtitleRowEditableCell: React.FC<SubtitleRowEditableCellProps> = ({
  value,
  isReadOnly,
  onCommit,
  fontFamily,
  fontSize,
  dir = 'auto',
  className,
  style,
  placeholder,
  displayHtml,
  emptyLabel,
  horizontalGrid = true,
  onLongPress,
  editTriggerNonce,
}) => {
  const cleanEditableSource = useMemo(() => toCleanEditableText(value || ''), [value]);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(cleanEditableSource);
  const isTypingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const justLongPressedRef = useRef(false);
  const lastEditTriggerRef = useRef<number | undefined>(editTriggerNonce);

  useEffect(() => {
    if (!isTypingRef.current) {
      setDraftValue(cleanEditableSource);
    }
  }, [cleanEditableSource]);

  useEffect(() => {
    if (
      editTriggerNonce !== undefined &&
      editTriggerNonce !== lastEditTriggerRef.current
    ) {
      lastEditTriggerRef.current = editTriggerNonce;
      if (!isReadOnly) {
        setDraftValue(cleanEditableSource);
        setIsEditing(true);
      }
    }
  }, [editTriggerNonce, isReadOnly, cleanEditableSource]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onLongPress) return;
    const t = e.touches[0];
    if (!t) return;
    justLongPressedRef.current = false;
    touchStartPosRef.current = { x: t.clientX, y: t.clientY };
    const pos = { x: t.clientX, y: t.clientY };
    longPressTimerRef.current = setTimeout(() => {
      justLongPressedRef.current = true;
      longPressTimerRef.current = null;
      onLongPress(pos);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(t.clientY - touchStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearLongPressTimer();
    }
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onLongPress) return;
    e.preventDefault();
    e.stopPropagation();
    onLongPress({ x: e.clientX, y: e.clientY });
  };

  const commitCleanDraft = () => {
    isTypingRef.current = false;
    setIsEditing(false);
    if (draftValue !== cleanEditableSource) {
      const nextValue = hasFormatting(value || '')
        ? reapplyFormattingTemplate(value || '', draftValue)
        : draftValue;
      onCommit(nextValue);
    }
  };

  const handleBlur = () => {
    commitCleanDraft();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitCleanDraft();
    } else if (e.key === 'Escape') {
      isTypingRef.current = false;
      setDraftValue(cleanEditableSource);
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isTypingRef.current = true;
    setDraftValue(e.target.value);
  };

  const sanitizedDisplayHtml = useMemo(() => {
    if (!displayHtml) return null;
    if (/\{[^}]+\}/.test(displayHtml)) {
      return formatSubtitlePreview(displayHtml, cleanEditableSource).html;
    }
    return displayHtml;
  }, [displayHtml, cleanEditableSource]);

  const activeText = isEditing ? draftValue : cleanEditableSource;
  const detectedDominantDir: 'rtl' | 'ltr' =
    dir === 'rtl' || dir === 'ltr'
      ? dir
      : detectLineDirection(activeText);

  const lines = activeText.split('\n');
  const longestLineChars = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const dynamicBoxWidthPx = Math.min(720, Math.max(220, Math.round(longestLineChars * (fontSize * 0.62)) + 34));
  // 3-line fixed box height with internal scrolling
  const threeLineFixedHeight = `${Math.round(fontSize * 1.55 * 3 + 14)}px`;

  const renderAlignedPlainText = (raw: string) => {
    const rawLines = raw.split('\n');
    if (rawLines.length <= 1) {
      const singleDir = dir === 'rtl' || dir === 'ltr' ? dir : detectLineDirection(raw);
      return (
        <span
          dir={singleDir}
          className={cn('block w-full', singleDir === 'rtl' ? 'text-right' : 'text-left')}
        >
          {raw}
        </span>
      );
    }
    return rawLines.map((line, idx) => {
      const lineDir = dir === 'rtl' || dir === 'ltr' ? dir : detectLineDirection(line);
      return (
        <span
          key={idx}
          dir={lineDir}
          className={cn('block w-full', lineDir === 'rtl' ? 'text-right' : 'text-left')}
        >
          {line || '\u00A0'}
        </span>
      );
    });
  };

  if (isReadOnly) {
    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
        className={cn(
          'select-text transition-colors ws-2line-clamp whitespace-pre-wrap break-words w-full block',
          detectedDominantDir === 'rtl' ? 'text-right' : 'text-left',
          horizontalGrid ? 'min-w-[200px] max-w-[680px]' : '',
          className
        )}
        style={{
          fontSize: `${fontSize}px`,
          fontFamily,
          color: 'var(--theme-text)',
          ...style,
        }}
        dir={detectedDominantDir}
        dangerouslySetInnerHTML={sanitizedDisplayHtml ? { __html: sanitizedDisplayHtml } : undefined}
      >
        {!sanitizedDisplayHtml
          ? cleanEditableSource
            ? renderAlignedPlainText(cleanEditableSource)
            : (
              <span
                className={cn(
                  'opacity-45 text-[11px] font-sans block w-full',
                  detectedDominantDir === 'rtl' ? 'text-right' : 'text-left'
                )}
              >
                {emptyLabel || '—'}
              </span>
            )
          : undefined}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        className="relative w-full"
        style={horizontalGrid ? { minWidth: `${dynamicBoxWidthPx}px`, maxWidth: '720px' } : { width: '100%' }}
      >
        <textarea
          autoFocus
          rows={3}
          wrap="off"
          value={draftValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          dir={detectedDominantDir}
          className={cn(
            'w-full leading-[1.55] px-1.5 py-1 border rounded-lg resize-none overflow-x-auto overflow-y-auto overscroll-auto focus:outline-none transition-[width,border-color]',
            detectedDominantDir === 'rtl' ? 'text-right font-urdu' : 'text-left font-sans'
          )}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily,
            height: threeLineFixedHeight,
            minHeight: threeLineFixedHeight,
            maxHeight: threeLineFixedHeight,
            backgroundColor: 'var(--theme-elevated)',
            borderColor: 'var(--theme-accent)',
            color: 'var(--theme-text)',
            WebkitTextFillColor: 'var(--theme-text)',
            touchAction: 'pan-x pan-y',
          }}
        />
        <div
          className={cn(
            'absolute bottom-1 text-[8px] font-mono font-semibold px-1 py-0.5 rounded border pointer-events-none',
            detectedDominantDir === 'rtl' ? 'left-1.5' : 'right-1.5'
          )}
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-accent)',
          }}
        >
          ↵ Save
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (justLongPressedRef.current) {
          justLongPressedRef.current = false;
          return;
        }
        setDraftValue(cleanEditableSource);
        setIsEditing(true);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
      title="Tap to edit · Long-press for actions"
      className={cn(
        'select-text transition-colors cursor-text rounded-md py-0.5 hover:ring-1 hover:ring-[var(--theme-accent)] ws-2line-clamp whitespace-pre-wrap break-words w-full block',
        detectedDominantDir === 'rtl' ? 'text-right' : 'text-left',
        horizontalGrid ? 'min-w-[200px] max-w-[680px]' : '',
        className
      )}
      style={{
        fontSize: `${fontSize}px`,
        fontFamily,
        color: 'var(--theme-text)',
        ...style,
      }}
      dir={detectedDominantDir}
    >
      {sanitizedDisplayHtml ? (
        <div
          dir={detectedDominantDir}
          className={cn('w-full block', detectedDominantDir === 'rtl' ? 'text-right' : 'text-left')}
          dangerouslySetInnerHTML={{ __html: sanitizedDisplayHtml }}
        />
      ) : cleanEditableSource ? (
        renderAlignedPlainText(cleanEditableSource)
      ) : (
        <span
          className={cn(
            'opacity-45 text-[11px] font-sans block w-full',
            detectedDominantDir === 'rtl' ? 'text-right' : 'text-left'
          )}
        >
          {emptyLabel || 'Tap to edit'}
        </span>
      )}
    </div>
  );
};
