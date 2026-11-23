import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Replace,
  X,
  Check,
  ArrowRight,
  RotateCcw,
  Undo2,
  Redo2,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import { executeFindAndReplace, FindReplaceOptions } from '../utils/subtitleOperations';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  selectedCount: number;
  selectedIndices: Set<number>;
  onApply: (updated: SubtitleItem[], count: number) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

interface MatchOccurrence {
  subIndex: number;
  startTime: string;
  endTime: string;
  field: 'ai' | 'original' | 'google';
  fieldLabel: string;
  currentText: string;
  previewReplacedText: string;
  matchCount: number;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  selectedCount,
  selectedIndices,
  onApply,
  onAddLog,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [targetField, setTargetField] = useState<'all' | 'ai' | 'original' | 'google'>('ai');
  const [applyToSelectedOnly, setApplyToSelectedOnly] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'ai' | 'original' | 'google'>('all');

  const [sessionSubtitles, setSessionSubtitles] = useState<SubtitleItem[]>(subtitles);
  const [history, setHistory] = useState<SubtitleItem[][]>([subtitles]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [totalReplacementsMade, setTotalReplacementsMade] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSessionSubtitles(subtitles);
      setHistory([subtitles]);
      setHistoryIndex(0);
      setTotalReplacementsMade(0);
    }
  }, [isOpen, subtitles]);

  const { regex, regexError } = useMemo(() => {
    if (!findText) return { regex: null, regexError: null };
    let flags = 'g';
    if (!matchCase) flags += 'i';
    try {
      if (useRegex) {
        return { regex: new RegExp(findText, flags), regexError: null };
      }
      let escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (matchWholeWord) escaped = `\\b${escaped}\\b`;
      return { regex: new RegExp(escaped, flags), regexError: null };
    } catch (err: any) {
      return { regex: null, regexError: err.message || 'Invalid Regular Expression' };
    }
  }, [findText, matchCase, matchWholeWord, useRegex]);

  const occurrences = useMemo<MatchOccurrence[]>(() => {
    if (!regex || !findText) return [];
    const list: MatchOccurrence[] = [];
    const checkAi = targetField === 'all' || targetField === 'ai';
    const checkOriginal = targetField === 'all' || targetField === 'original';
    const checkGoogle = targetField === 'all' || targetField === 'google';

    for (const sub of sessionSubtitles) {
      if (applyToSelectedOnly && selectedCount > 0 && !selectedIndices.has(sub.index)) continue;

      if (checkOriginal && sub.text) {
        const matches = sub.text.match(regex);
        if (matches?.length) {
          list.push({
            subIndex: sub.index,
            startTime: sub.startTime,
            endTime: sub.endTime,
            field: 'original',
            fieldLabel: 'Original',
            currentText: sub.text,
            previewReplacedText: sub.text.replace(regex, replaceText),
            matchCount: matches.length,
          });
        }
      }

      if (checkAi && sub.translatedText) {
        const matches = sub.translatedText.match(regex);
        if (matches?.length) {
          list.push({
            subIndex: sub.index,
            startTime: sub.startTime,
            endTime: sub.endTime,
            field: 'ai',
            fieldLabel: 'AI',
            currentText: sub.translatedText,
            previewReplacedText: sub.translatedText.replace(regex, replaceText),
            matchCount: matches.length,
          });
        }
      }

      if (checkGoogle && sub.googleTranslateText) {
        const matches = sub.googleTranslateText.match(regex);
        if (matches?.length) {
          list.push({
            subIndex: sub.index,
            startTime: sub.startTime,
            endTime: sub.endTime,
            field: 'google',
            fieldLabel: 'Google',
            currentText: sub.googleTranslateText,
            previewReplacedText: sub.googleTranslateText.replace(regex, replaceText),
            matchCount: matches.length,
          });
        }
      }
    }
    return list;
  }, [regex, findText, replaceText, sessionSubtitles, targetField, applyToSelectedOnly, selectedCount, selectedIndices]);

  const totalMatchCount = useMemo(() => occurrences.reduce((acc, c) => acc + c.matchCount, 0), [occurrences]);
  const uniqueBlocksCount = useMemo(() => new Set(occurrences.map((o) => o.subIndex)).size, [occurrences]);

  const renderHighlighted = useCallback(
    (text: string, isReplacement = false) => {
      if (!regex || !text) return text;
      try {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const clone = new RegExp(regex.source, regex.flags);
        let match: RegExpExecArray | null;

        while ((match = clone.exec(text)) !== null) {
          if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
          parts.push(
            <mark
              key={`${match.index}-${lastIndex}`}
              className={cn(
                'font-semibold rounded px-1 inline-block border',
                isReplacement
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/35'
                  : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/35'
              )}
            >
              {match[0]}
            </mark>
          );
          lastIndex = clone.lastIndex;
          if (!regex.global) break;
        }
        if (lastIndex < text.length) parts.push(text.slice(lastIndex));
        return parts.length > 0 ? parts : text;
      } catch {
        return text;
      }
    },
    [regex]
  );

  const pushState = (newSubtitles: SubtitleItem[], countAdded: number) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newSubtitles);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setSessionSubtitles(newSubtitles);
    setTotalReplacementsMade((prev) => prev + countAdded);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setSessionSubtitles(history[prevIndex]);
      onAddLog('Find & Replace: Undo step applied.', 'info');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setSessionSubtitles(history[nextIndex]);
      onAddLog('Find & Replace: Redo step applied.', 'info');
    }
  };

  const handleReset = () => {
    setSessionSubtitles(subtitles);
    setHistory([subtitles]);
    setHistoryIndex(0);
    setTotalReplacementsMade(0);
    onAddLog('Find & Replace: Reset session back to baseline.', 'warning');
  };

  const handleReplaceNext = () => {
    if (!regex || occurrences.length === 0) return;
    const target = occurrences[0];
    const singleRegex = new RegExp(regex.source, regex.flags.replace('g', ''));
    const nextSubtitles = sessionSubtitles.map((s) => {
      if (s.index !== target.subIndex) return s;
      const copy = { ...s };
      if (target.field === 'ai' && copy.translatedText) copy.translatedText = copy.translatedText.replace(singleRegex, replaceText);
      else if (target.field === 'original' && copy.text) copy.text = copy.text.replace(singleRegex, replaceText);
      else if (target.field === 'google' && copy.googleTranslateText) copy.googleTranslateText = copy.googleTranslateText.replace(singleRegex, replaceText);
      return copy;
    });
    pushState(nextSubtitles, 1);
    onAddLog(`Find & Replace: Replaced match in block #${target.subIndex}.`, 'success');
  };

  const handleReplaceSingleBlock = (subIndex: number, field: 'ai' | 'original' | 'google') => {
    if (!regex) return;
    let countInBlock = 0;
    const nextSubtitles = sessionSubtitles.map((s) => {
      if (s.index !== subIndex) return s;
      const copy = { ...s };
      if (field === 'ai' && copy.translatedText) {
        const m = copy.translatedText.match(regex);
        if (m) countInBlock += m.length;
        copy.translatedText = copy.translatedText.replace(regex, replaceText);
      } else if (field === 'original' && copy.text) {
        const m = copy.text.match(regex);
        if (m) countInBlock += m.length;
        copy.text = copy.text.replace(regex, replaceText);
      } else if (field === 'google' && copy.googleTranslateText) {
        const m = copy.googleTranslateText.match(regex);
        if (m) countInBlock += m.length;
        copy.googleTranslateText = copy.googleTranslateText.replace(regex, replaceText);
      }
      return copy;
    });
    if (countInBlock > 0) {
      pushState(nextSubtitles, countInBlock);
      onAddLog(`Replaced ${countInBlock} occurrence(s) in block #${subIndex}.`, 'success');
    }
  };

  const handleReplaceAll = () => {
    if (!findText.trim()) return;
    const options: FindReplaceOptions = {
      findText,
      replaceText,
      matchCase,
      matchWholeWord,
      useRegex,
      targetField,
      selectedIndices: applyToSelectedOnly && selectedCount > 0 ? selectedIndices : undefined,
    };
    const { updatedSubtitles, replaceCount } = executeFindAndReplace(sessionSubtitles, options);
    if (replaceCount > 0) {
      pushState(updatedSubtitles, replaceCount);
      onAddLog(`Find & Replace replaced ${replaceCount} occurrence(s).`, 'success');
    }
  };

  const handleApplyAndClose = () => {
    onApply(sessionSubtitles, totalReplacementsMade);
    onClose();
  };

  if (!isOpen) return null;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const isModifiedFromInitial = historyIndex > 0 || totalReplacementsMade > 0;
  const filteredOccurrences = occurrences.filter((o) => previewFilter === 'all' || o.field === previewFilter);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-20px)] sm:max-w-4xl w-full max-h-[calc(100dvh-20px)] overflow-hidden flex flex-col text-xs"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        {/* Header */}
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Replace size={15} style={{ color: 'var(--theme-accent)' }} />
            <h3 className="font-semibold text-sm truncate">Find & Replace</h3>
            <InfoPopover
              title="Find & Replace Studio"
              description="Live match highlighting across Original, AI, or Google columns with regex support and session Undo/Redo before applying."
            />
            {findText && (
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border tabular-nums shrink-0"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                {totalMatchCount} / {uniqueBlocksCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="h-7 px-2 rounded-lg border disabled:opacity-35 flex items-center gap-1 text-[10.5px] font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Undo"
            >
              <Undo2 size={12} />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="h-7 px-2 rounded-lg border disabled:opacity-35 flex items-center gap-1 text-[10.5px] font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Redo"
            >
              <Redo2 size={12} />
              <span className="hidden sm:inline">Redo</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={!isModifiedFromInitial}
              className="h-7 px-2 rounded-lg border border-red-500/30 text-red-500 disabled:opacity-30 flex items-center gap-1 text-[10.5px] font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)' }}
              title="Reset baseline"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[11px] flex items-center gap-1">
                  <Search size={12} style={{ color: 'var(--theme-accent)' }} />
                  <span>Find</span>
                </label>
                {findText && (
                  <button type="button" onClick={() => setFindText('')} className="text-[10px] opacity-60 hover:opacity-100 cursor-pointer">
                    Clear
                  </button>
                )}
              </div>
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Word, phrase, or regex..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none text-xs"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                autoFocus
              />
              {regexError && (
                <div className="flex items-center gap-1 text-[10px] text-red-500">
                  <AlertCircle size={11} />
                  <span>{regexError}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[11px] flex items-center gap-1">
                <Replace size={12} style={{ color: 'var(--theme-accent)' }} />
                <span>Replace</span>
              </label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replacement text..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none text-xs"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              />
            </div>
          </div>

          <div
            className="p-2.5 rounded-xl border space-y-2.5"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'ai', label: 'AI' },
                    { id: 'original', label: 'Original' },
                    { id: 'google', label: 'Google' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTargetField(t.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer',
                      targetField === t.id ? 'text-white border-transparent' : 'opacity-70 hover:opacity-100'
                    )}
                    style={
                      targetField === t.id
                        ? { backgroundColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap text-[11px]">
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} className="rounded w-3.5 h-3.5" style={{ accentColor: 'var(--theme-accent)' }} />
                  <span>Case (Aa)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={matchWholeWord} onChange={(e) => setMatchWholeWord(e.target.checked)} className="rounded w-3.5 h-3.5" style={{ accentColor: 'var(--theme-accent)' }} />
                  <span>Word (\b)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} className="rounded w-3.5 h-3.5" style={{ accentColor: 'var(--theme-accent)' }} />
                  <span>Regex (.*)</span>
                </label>
              </div>
            </div>

            {selectedCount > 0 && (
              <div className="pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'var(--theme-border)' }}>
                <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                  <input
                    type="checkbox"
                    checked={applyToSelectedOnly}
                    onChange={(e) => setApplyToSelectedOnly(e.target.checked)}
                    className="rounded w-3.5 h-3.5"
                    style={{ accentColor: 'var(--theme-accent)' }}
                  />
                  <span>Selected only ({selectedCount})</span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center gap-1.5">
                <Eye size={13} style={{ color: 'var(--theme-accent)' }} />
                <span className="font-semibold text-[11px]">Matches</span>
                {totalMatchCount > 0 && (
                  <span className="text-[10px] opacity-60 font-mono tabular-nums">
                    ({occurrences.length} / {uniqueBlocksCount} blocks)
                  </span>
                )}
              </div>

              {occurrences.length > 0 && (
                <div className="flex items-center gap-1 text-[10px]">
                  {(['all', 'ai', 'original', 'google'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setPreviewFilter(f)}
                      className={cn(
                        'px-2 py-0.5 rounded font-semibold uppercase cursor-pointer',
                        previewFilter === f ? 'text-white' : 'opacity-60 hover:opacity-100'
                      )}
                      style={previewFilter === f ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!findText ? (
              <div className="p-6 text-center rounded-xl border border-dashed opacity-60" style={{ borderColor: 'var(--theme-border)' }}>
                <Search size={22} className="mx-auto mb-1 opacity-50" />
                <p className="text-[11px]">Enter text above to preview live matches</p>
              </div>
            ) : filteredOccurrences.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed opacity-70" style={{ borderColor: 'var(--theme-border)' }}>
                <AlertCircle size={22} className="mx-auto mb-1 text-amber-500" />
                <p className="text-[11px]">No matches for &ldquo;{findText}&rdquo;</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
                {filteredOccurrences.map((occ, i) => (
                  <div
                    key={`${occ.subIndex}-${occ.field}-${i}`}
                    className="p-2.5 rounded-xl border space-y-2"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold px-1.5 py-0.5 rounded border tabular-nums" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                          #{occ.subIndex}
                        </span>
                        <span className="font-mono opacity-60 truncate tabular-nums">
                          {occ.startTime} → {occ.endTime}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase border" style={{ borderColor: 'var(--theme-border)' }}>
                          {occ.fieldLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
                          {occ.matchCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReplaceSingleBlock(occ.subIndex, occ.field)}
                          className="px-2 py-0.5 rounded text-white font-semibold text-[10px] cursor-pointer"
                          style={{ backgroundColor: 'var(--theme-accent)' }}
                        >
                          Replace #{occ.subIndex}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                        <div className="text-[9px] font-semibold uppercase opacity-60 mb-1">Before</div>
                        <div
                          className={cn('leading-relaxed text-[11px]', occ.field !== 'original' && 'font-urdu text-right')}
                          dir={occ.field !== 'original' ? 'rtl' : 'ltr'}
                        >
                          {renderHighlighted(occ.currentText, false)}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg border" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                        <div className="text-[9px] font-semibold uppercase mb-1" style={{ color: 'var(--theme-accent)' }}>
                          After
                        </div>
                        <div
                          className={cn('leading-relaxed text-[11px]', occ.field !== 'original' && 'font-urdu text-right')}
                          dir={occ.field !== 'original' ? 'rtl' : 'ltr'}
                        >
                          {renderHighlighted(occ.previewReplacedText, true)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-3.5 py-2.5 border-t flex flex-wrap items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <span className="text-[11px] opacity-75 tabular-nums">
            Replaced: <strong style={{ color: 'var(--theme-accent)' }}>{totalReplacementsMade}</strong>
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border font-medium text-[11px] cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReplaceNext}
              disabled={!findText || occurrences.length === 0}
              className="px-3 py-1.5 rounded-lg border font-medium text-[11px] flex items-center gap-1 disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <ArrowRight size={12} />
              <span>Next</span>
            </button>
            <button
              type="button"
              onClick={handleReplaceAll}
              disabled={!findText || totalMatchCount === 0}
              className="px-3 py-1.5 rounded-lg text-white font-semibold text-[11px] flex items-center gap-1 disabled:opacity-40 cursor-pointer tabular-nums"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Replace size={12} />
              <span>All ({totalMatchCount})</span>
            </button>
            <button
              type="button"
              onClick={handleApplyAndClose}
              className="px-3.5 py-1.5 rounded-lg text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Check size={12} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
