import React, { useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Check,
  SlidersHorizontal,
  FoldHorizontal,
  ListFilter,
  AlertTriangle,
  Lock,
  Zap,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import {
  calculateSubtitleGaps,
  adjustSubtitleGaps,
  OriginalTimingMap,
  SubtitleGapInfo,
} from '../utils/subtitleOperations';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface GapTimingModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  selectedCount: number;
  selectedIndices: Set<number>;
  originalTimingMap: OriginalTimingMap;
  onApply: (updated: SubtitleItem[], summary: string) => void;
  onResetToOriginal: () => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddNotification: (msg: string, type: 'success' | 'error') => void;
}

type TabType = 'remove' | 'custom' | 'inspector';

export const GapTimingModal: React.FC<GapTimingModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  selectedCount,
  selectedIndices,
  originalTimingMap,
  onApply,
  onResetToOriginal,
  onAddLog,
  onAddNotification,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('remove');
  const [removeGapPreset, setRemoveGapPreset] = useState<number>(0);
  const [removeMaxThreshold, setRemoveMaxThreshold] = useState<number>(0);
  const [customGapMs, setCustomGapMs] = useState<number>(80);
  const [customMode, setCustomMode] = useState<'exact' | 'increase' | 'decrease'>('exact');
  const [customDeltaMs, setCustomDeltaMs] = useState<number>(50);
  const [customMaxThreshold] = useState<number>(0);
  const [minDurationMs, setMinDurationMs] = useState<number>(250);
  const [applyToSelectedOnly, setApplyToSelectedOnly] = useState<boolean>(false);
  const [inspectorSearch, setInspectorSearch] = useState<string>('');
  const [inspectorFilter, setInspectorFilter] = useState<'all' | 'gapsOnly' | 'overlapsOnly' | 'seamlessOnly'>('all');

  const gapList = useMemo<SubtitleGapInfo[]>(() => calculateSubtitleGaps(subtitles), [subtitles]);

  const stats = useMemo(() => {
    if (gapList.length === 0) return { totalPairs: 0, gapsWithSpace: 0, seamlessCount: 0, overlapCount: 0, avgGapMs: 0 };
    const gapsWithSpace = gapList.filter((g) => g.gapMs > 0).length;
    const seamlessCount = gapList.filter((g) => g.gapMs === 0).length;
    const overlapCount = gapList.filter((g) => g.gapMs < 0).length;
    const totalGapMs = gapList.reduce((acc, g) => acc + Math.max(0, g.gapMs), 0);
    const avgGapMs = gapsWithSpace > 0 ? Math.round(totalGapMs / gapsWithSpace) : 0;
    return { totalPairs: gapList.length, gapsWithSpace, seamlessCount, overlapCount, avgGapMs };
  }, [gapList]);

  const modifiedFromOriginalCount = useMemo(() => {
    let count = 0;
    subtitles.forEach((s) => {
      const orig = originalTimingMap[s.index];
      if (orig && (orig.startTime !== s.startTime || orig.endTime !== s.endTime)) count++;
    });
    return count;
  }, [subtitles, originalTimingMap]);

  if (!isOpen) return null;

  const effectiveSelected = applyToSelectedOnly && selectedCount > 0 ? selectedIndices : undefined;
  const scopeLabel = effectiveSelected ? `${selectedCount} selected` : `all ${subtitles.length}`;

  const handleExecuteRemoveGaps = () => {
    const { updatedSubtitles, adjustedCount } = adjustSubtitleGaps(subtitles, {
      mode: 'exact',
      targetGapMs: removeGapPreset,
      maxGapThresholdMs: removeMaxThreshold,
      minDurationMs,
      selectedIndices: effectiveSelected,
    });
    if (adjustedCount === 0) {
      onAddNotification('No gaps needed adjustment.', 'success');
      return;
    }
    const gapDesc = removeGapPreset === 0 ? '0ms' : `${removeGapPreset}ms`;
    const summary = `Adjusted ${adjustedCount} gaps (${gapDesc}) across ${scopeLabel}.`;
    onApply(updatedSubtitles, summary);
    onAddNotification(`Snapped ${adjustedCount} endings (${gapDesc})`, 'success');
    onAddLog(summary, 'success');
  };

  const handleExecuteCustomGap = () => {
    const { updatedSubtitles, adjustedCount } = adjustSubtitleGaps(subtitles, {
      mode: customMode,
      targetGapMs: customGapMs,
      deltaMs: customDeltaMs,
      maxGapThresholdMs: customMaxThreshold,
      minDurationMs,
      selectedIndices: effectiveSelected,
    });
    if (adjustedCount === 0) {
      onAddNotification('No blocks met criteria.', 'success');
      return;
    }
    let modeDesc = `${customGapMs}ms`;
    if (customMode === 'increase') modeDesc = `+${customDeltaMs}ms`;
    if (customMode === 'decrease') modeDesc = `-${customDeltaMs}ms`;
    const summary = `Adjusted ${adjustedCount} gaps (${modeDesc}) across ${scopeLabel}.`;
    onApply(updatedSubtitles, summary);
    onAddNotification(`Adjusted ${adjustedCount} blocks (${modeDesc})`, 'success');
    onAddLog(summary, 'success');
  };

  const handleSnapSingle = (targetIndex: number, targetGap: number) => {
    const { updatedSubtitles, adjustedCount } = adjustSubtitleGaps(subtitles, {
      mode: 'exact',
      targetGapMs: targetGap,
      minDurationMs,
      targetIndex,
    });
    if (adjustedCount > 0) {
      const summary = `Snapped gap after #${targetIndex} to ${targetGap}ms.`;
      onApply(updatedSubtitles, summary);
      onAddNotification(`Snapped #${targetIndex} to ${targetGap}ms`, 'success');
      onAddLog(summary, 'success');
    }
  };

  const filteredGaps = gapList.filter((g) => {
    if (inspectorFilter === 'gapsOnly' && g.gapMs <= 0) return false;
    if (inspectorFilter === 'overlapsOnly' && g.gapMs >= 0) return false;
    if (inspectorFilter === 'seamlessOnly' && g.gapMs !== 0) return false;
    if (inspectorSearch.trim()) {
      const q = inspectorSearch.toLowerCase();
      if (!g.index.toString().includes(q) && !g.nextIndex.toString().includes(q) && !g.text.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-2.5 sm:p-4 bg-black/58 backdrop-touch-lock">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-20px)] sm:max-w-3xl w-full max-h-[calc(100dvh-20px)] flex flex-col overflow-hidden text-xs anim-pop-in mc-popup mc-role-timing"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 mc-popup-header"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FoldHorizontal size={15} style={{ color: 'var(--theme-accent)' }} className="mc-popup-title" />
            <h3 className="font-semibold text-sm truncate mc-popup-title">Gap Timing</h3>
            <InfoPopover
              title="Non-Destructive Gap Timing"
              description="Adjusts only block end times so dialogue start times remain locked. Includes seamless 0ms snap, custom range, and live inspector."
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onResetToOriginal}
              disabled={modifiedFromOriginalCount === 0}
              className="h-7 px-2.5 rounded-lg border text-[10.5px] font-medium flex items-center gap-1 disabled:opacity-35 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <RotateCcw size={12} />
              <span>Reset{modifiedFromOriginalCount > 0 ? ` (${modifiedFromOriginalCount})` : ''}</span>
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div
          className="px-3.5 py-1.5 border-b flex items-center justify-between gap-2 overflow-x-auto shrink-0"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'remove', label: 'Remove Gaps', icon: FoldHorizontal },
                { id: 'custom', label: 'Custom Range', icon: SlidersHorizontal },
                { id: 'inspector', label: `Inspector (${gapList.length})`, icon: ListFilter },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer border',
                    active ? 'text-white border-transparent' : 'opacity-70 hover:opacity-100'
                  )}
                  style={
                    active
                      ? { backgroundColor: 'var(--theme-accent)' }
                      : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                  }
                >
                  <Icon size={12} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2.5 text-[10.5px] opacity-75 tabular-nums shrink-0">
            <span>Gaps: {stats.gapsWithSpace}</span>
            <span>Avg: {stats.avgGapMs}ms</span>
            {stats.overlapCount > 0 && (
              <span className="text-red-500 font-semibold flex items-center gap-0.5">
                <AlertTriangle size={11} />
                {stats.overlapCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
          {activeTab === 'remove' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 0, label: '0 ms (Flush)' },
                  { value: 40, label: '40 ms (1f)' },
                  { value: 80, label: '80 ms (2f)' },
                  { value: 120, label: '120 ms (3f)' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setRemoveGapPreset(preset.value)}
                    className={cn(
                      'p-2.5 rounded-lg border text-left font-semibold cursor-pointer flex items-center justify-between',
                      removeGapPreset === preset.value ? 'text-white border-transparent' : 'opacity-80 hover:opacity-100'
                    )}
                    style={
                      removeGapPreset === preset.value
                        ? { backgroundColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    <span>{preset.label}</span>
                    {removeGapPreset === preset.value && <Check size={12} />}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px]">Max Gap Threshold</span>
                  <span className="text-[10px] opacity-65 tabular-nums">
                    {removeMaxThreshold === 0 ? 'All gaps' : `≤ ${removeMaxThreshold} ms`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { value: 0, label: 'All' },
                    { value: 1000, label: '≤ 1s' },
                    { value: 2000, label: '≤ 2s' },
                    { value: 5000, label: '≤ 5s' },
                  ].map((thresh) => (
                    <button
                      key={thresh.value}
                      type="button"
                      onClick={() => setRemoveMaxThreshold(thresh.value)}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer',
                        removeMaxThreshold === thresh.value ? 'text-white border-transparent' : 'opacity-75'
                      )}
                      style={
                        removeMaxThreshold === thresh.value
                          ? { backgroundColor: 'var(--theme-accent)' }
                          : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                      }
                    >
                      {thresh.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10.5px] opacity-70 tabular-nums">
                  {removeGapPreset}ms · {scopeLabel}
                </span>
                <button
                  type="button"
                  onClick={handleExecuteRemoveGaps}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                >
                  <Zap size={13} />
                  <span>Remove Gaps ({removeGapPreset}ms)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'exact', title: 'Exact Gap' },
                  { id: 'decrease', title: 'Decrease' },
                  { id: 'increase', title: 'Increase' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCustomMode(m.id as 'exact' | 'increase' | 'decrease')}
                    className={cn(
                      'p-2.5 rounded-lg border font-semibold cursor-pointer flex items-center justify-between',
                      customMode === m.id ? 'text-white border-transparent' : 'opacity-80'
                    )}
                    style={
                      customMode === m.id
                        ? { backgroundColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    <span>{m.title}</span>
                    {customMode === m.id && <Check size={12} />}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-xl border space-y-2.5" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px]">{customMode === 'exact' ? 'Target Gap (ms)' : 'Delta Step (ms)'}</span>
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    step={10}
                    value={customMode === 'exact' ? customGapMs : customDeltaMs}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      if (customMode === 'exact') setCustomGapMs(val);
                      else setCustomDeltaMs(val);
                    }}
                    className="w-24 px-2 py-1 text-center font-mono font-bold border rounded-lg tabular-nums"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  />
                </div>

                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={10}
                  value={customMode === 'exact' ? customGapMs : customDeltaMs}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (customMode === 'exact') setCustomGapMs(val);
                    else setCustomDeltaMs(val);
                  }}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--theme-accent)' }}
                />

                <div className="flex flex-wrap gap-1">
                  {[0, 40, 80, 150, 250, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => (customMode === 'exact' ? setCustomGapMs(preset) : setCustomDeltaMs(preset))}
                      className="px-2 py-0.5 rounded border font-mono text-[10px] cursor-pointer tabular-nums"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                    >
                      {preset}ms
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <ShieldCheck size={14} style={{ color: 'var(--theme-accent)' }} />
                  <span>Min Duration Guard (ms)</span>
                </div>
                <input
                  type="number"
                  min={100}
                  max={2000}
                  step={50}
                  value={minDurationMs}
                  onChange={(e) => setMinDurationMs(Math.max(100, parseInt(e.target.value, 10) || 200))}
                  className="w-20 px-2 py-1 text-center font-mono font-bold border rounded-lg tabular-nums"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleExecuteCustomGap}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                >
                  <SlidersHorizontal size={13} />
                  <span>Apply Custom Gap</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'inspector' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    placeholder="Filter # or text..."
                    value={inspectorSearch}
                    onChange={(e) => setInspectorSearch(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border text-xs"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  />
                </div>
                <div className="flex items-center gap-1 p-0.5 rounded-lg border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
                  {[
                    { id: 'all', label: `All (${gapList.length})` },
                    { id: 'gapsOnly', label: `Gaps (${stats.gapsWithSpace})` },
                    { id: 'seamlessOnly', label: `0ms (${stats.seamlessCount})` },
                    { id: 'overlapsOnly', label: `Overlap (${stats.overlapCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setInspectorFilter(f.id as typeof inspectorFilter)}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-semibold cursor-pointer tabular-nums',
                        inspectorFilter === f.id ? 'text-white' : 'opacity-65'
                      )}
                      style={inspectorFilter === f.id ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border rounded-xl overflow-auto max-h-[280px]" style={{ borderColor: 'var(--theme-border)' }}>
                <table className="w-full text-left text-[11px] border-collapse min-w-[480px]">
                  <thead className="sticky top-0 border-b" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
                    <tr>
                      <th className="py-1.5 px-2.5">#</th>
                      <th className="py-1.5 px-2.5">Range</th>
                      <th className="py-1.5 px-2.5 text-center">Gap</th>
                      <th className="py-1.5 px-2.5">Next</th>
                      <th className="py-1.5 px-2.5 text-right">Snap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--theme-border)' }}>
                    {filteredGaps.map((g) => (
                      <tr key={g.index}>
                        <td className="py-1.5 px-2.5 font-mono font-bold tabular-nums">#{g.index}</td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px] tabular-nums">
                          <span className="inline-flex items-center gap-0.5 opacity-70">
                            <Lock size={9} />
                            {g.startTime}
                          </span>{' '}
                          → {g.endTime}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-mono font-semibold tabular-nums">
                          {g.gapMs === 0 ? '0ms' : g.gapMs < 0 ? <span className="text-red-500">{g.gapMs}ms</span> : `+${g.gapMs}ms`}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px] tabular-nums">
                          #{g.nextIndex} @ {g.nextStartTime}
                        </td>
                        <td className="py-1.5 px-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleSnapSingle(g.index, 0)}
                            className="px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer mr-1"
                            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                          >
                            0ms
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSnapSingle(g.index, 80)}
                            className="px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer"
                            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                          >
                            80ms
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Scope */}
          <div
            className="p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <span className="font-semibold text-[11px]">Scope</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setApplyToSelectedOnly(false)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer', !applyToSelectedOnly ? 'text-white border-transparent' : 'opacity-75')}
                style={!applyToSelectedOnly ? { backgroundColor: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                All ({subtitles.length})
              </button>
              <button
                type="button"
                onClick={() => setApplyToSelectedOnly(true)}
                disabled={selectedCount === 0}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-semibold border disabled:opacity-40 cursor-pointer', applyToSelectedOnly ? 'text-white border-transparent' : 'opacity-75')}
                style={applyToSelectedOnly ? { backgroundColor: 'var(--theme-accent)' } : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                Selected ({selectedCount})
              </button>
            </div>
          </div>
        </div>

        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-between gap-2 shrink-0 mc-popup-footer"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <button
            type="button"
            onClick={onResetToOriginal}
            disabled={modifiedFromOriginalCount === 0}
            className="px-3 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 disabled:opacity-35 cursor-pointer"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            <RotateCcw size={12} />
            <span>Reset Baseline</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
