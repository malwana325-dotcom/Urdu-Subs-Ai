import React, { useState } from 'react';
import { Clock, X, FastForward, Rewind } from 'lucide-react';
import { SubtitleItem, shiftSubtitleTimings } from '../utils/srtParser';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface TimeShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  selectedCount: number;
  selectedIndices: Set<number>;
  onApply: (updated: SubtitleItem[], shiftMs: number) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const TimeShiftModal: React.FC<TimeShiftModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  selectedCount,
  selectedIndices,
  onApply,
  onAddLog,
}) => {
  const [shiftDirection, setShiftDirection] = useState<'forward' | 'backward'>('forward');
  const [milliseconds, setMilliseconds] = useState<number>(500);
  const [applyToSelectedOnly, setApplyToSelectedOnly] = useState(false);

  if (!isOpen) return null;

  const presets = [100, 250, 500, 1000, 2000, 5000];

  const handleExecute = () => {
    if (milliseconds <= 0) return;
    const finalShift = shiftDirection === 'forward' ? milliseconds : -milliseconds;
    const updated = shiftSubtitleTimings(
      subtitles,
      finalShift,
      applyToSelectedOnly && selectedCount > 0 ? selectedIndices : undefined
    );
    onApply(updated, finalShift);
    const scopeStr =
      applyToSelectedOnly && selectedCount > 0 ? `${selectedCount} selected subtitles` : `all ${subtitles.length} subtitles`;
    onAddLog(`Shifted timings for ${scopeStr} by ${finalShift > 0 ? '+' : ''}${finalShift}ms.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-24px)] sm:max-w-md w-full max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col text-xs"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2">
            <Clock size={15} style={{ color: 'var(--theme-accent)' }} />
            <h3 className="font-semibold text-sm">Time Shift</h3>
            <InfoPopover
              title="Subtitle Time Shift"
              description="Shift subtitle timestamps forward (+) or backward (-) by milliseconds for all blocks or selected rows."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-3.5 overflow-y-auto">
          <div>
            <label className="font-semibold text-[11px] block mb-1.5">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShiftDirection('forward')}
                className={cn(
                  'py-2.5 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-colors',
                  shiftDirection === 'forward' ? 'text-white border-transparent' : 'opacity-75 hover:opacity-100'
                )}
                style={
                  shiftDirection === 'forward'
                    ? { backgroundColor: 'var(--theme-accent)' }
                    : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                }
              >
                <FastForward size={14} />
                <span>Delay (+ms)</span>
              </button>

              <button
                type="button"
                onClick={() => setShiftDirection('backward')}
                className={cn(
                  'py-2.5 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-colors',
                  shiftDirection === 'backward' ? 'bg-amber-600 text-white border-transparent' : 'opacity-75 hover:opacity-100'
                )}
                style={
                  shiftDirection !== 'backward'
                    ? { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    : undefined
                }
              >
                <Rewind size={14} />
                <span>Advance (-ms)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-[11px] block mb-1.5">Offset (ms)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="60000"
                step="50"
                value={milliseconds}
                onChange={(e) => setMilliseconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm font-mono font-bold tabular-nums"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              />
              <span className="font-mono text-[11px] opacity-70 shrink-0 tabular-nums">
                {(milliseconds / 1000).toFixed(2)}s
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map((ms) => (
              <button
                key={ms}
                type="button"
                onClick={() => setMilliseconds(ms)}
                className={cn(
                  'px-2.5 py-1 rounded-md border font-mono text-[10px] font-semibold cursor-pointer tabular-nums',
                  milliseconds === ms ? 'text-white border-transparent' : 'opacity-75 hover:opacity-100'
                )}
                style={
                  milliseconds === ms
                    ? { backgroundColor: 'var(--theme-accent)' }
                    : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                }
              >
                {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
              </button>
            ))}
          </div>

          {selectedCount > 0 && (
            <label
              className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-medium"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <input
                type="checkbox"
                checked={applyToSelectedOnly}
                onChange={(e) => setApplyToSelectedOnly(e.target.checked)}
                className="rounded w-3.5 h-3.5"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
              <span>Selected only ({selectedCount})</span>
            </label>
          )}
        </div>

        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-end gap-2"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={milliseconds <= 0}
            className="px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 disabled:opacity-45 cursor-pointer"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            <Clock size={13} />
            <span>Apply Shift</span>
          </button>
        </div>
      </div>
    </div>
  );
};
