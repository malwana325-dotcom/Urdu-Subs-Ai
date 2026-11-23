import React from 'react';
import {
  X,
  Undo2,
  Redo2,
  Edit3,
  Replace,
  Wand2,
  Clock,
  FoldHorizontal,
  Stamp,
  RotateCcw,
  Save,
  Columns,
  AlertTriangle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../utils/cn';

interface MobileToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenEditor: () => void;
  onOpenFindReplace: () => void;
  onOpenCleanup: () => void;
  onOpenTimeShift: () => void;
  onOpenGapTiming: () => void;
  onOpenWatermark: () => void;
  onResetTimings: () => void;
  onSaveDraftQuick: () => void;
  visibleColumns: { time: boolean; original: boolean; ai: boolean; google: boolean };
  onChangeVisibleColumns: (cols: { time: boolean; original: boolean; ai: boolean; google: boolean }) => void;
  enableQcInspector: boolean;
  qcOnlyFilter: boolean;
  onToggleQcOnlyFilter: () => void;
}

export const MobileToolsSheet: React.FC<MobileToolsSheetProps> = ({
  isOpen,
  onClose,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenEditor,
  onOpenFindReplace,
  onOpenCleanup,
  onOpenTimeShift,
  onOpenGapTiming,
  onOpenWatermark,
  onResetTimings,
  onSaveDraftQuick,
  visibleColumns,
  onChangeVisibleColumns,
  enableQcInspector,
  qcOnlyFilter,
  onToggleQcOnlyFilter,
}) => {
  const triggerAndClose = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={onClose} />
          <motion.div
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-xl p-3.5 pb-safe space-y-3 mobile-fixed-chrome"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
          >
            <div className="w-8 h-1 rounded-full bg-current opacity-20 mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-80">Tools</h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center opacity-65 hover:opacity-100 cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => triggerAndClose(onUndo)}
                disabled={!canUndo}
                className="min-h-[40px] rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-35 cursor-pointer touch-tactile"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                <Undo2 size={14} />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={() => triggerAndClose(onRedo)}
                disabled={!canRedo}
                className="min-h-[40px] rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-35 cursor-pointer touch-tactile"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                <Redo2 size={14} />
                <span>Redo</span>
              </button>
              <button
                type="button"
                onClick={() => triggerAndClose(onSaveDraftQuick)}
                className="min-h-[40px] rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                <Save size={14} />
                <span>Draft</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Clean Studio', icon: Edit3, action: onOpenEditor },
                { label: 'Find / Replace', icon: Replace, action: onOpenFindReplace },
                { label: 'Cleanup', icon: Wand2, action: onOpenCleanup },
                { label: 'Time Shift', icon: Clock, action: onOpenTimeShift },
                { label: 'Gap Timing', icon: FoldHorizontal, action: onOpenGapTiming },
                { label: 'Watermark', icon: Stamp, action: onOpenWatermark },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    onClick={() => triggerAndClose(tool.action)}
                    className="min-h-[40px] px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer text-left touch-tactile"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    <Icon size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                    <span className="truncate">{tool.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => triggerAndClose(onResetTimings)}
              className="w-full min-h-[38px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <RotateCcw size={13} />
              <span>Reset Timings</span>
            </button>

            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-75">
                <Columns size={13} style={{ color: 'var(--theme-accent)' }} />
                <span>Columns</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { key: 'time', label: 'Time & CPS' },
                    { key: 'original', label: 'Original' },
                    { key: 'ai', label: 'AI Urdu' },
                    { key: 'google', label: 'Google' },
                  ] as const
                ).map((col) => (
                  <label
                    key={col.key}
                    className="min-h-[36px] px-2.5 rounded-lg border flex items-center gap-2 text-xs font-medium cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key]}
                      onChange={(e) =>
                        onChangeVisibleColumns({ ...visibleColumns, [col.key]: e.target.checked })
                      }
                      className="rounded w-3.5 h-3.5"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {enableQcInspector && (
              <button
                type="button"
                onClick={() => {
                  onToggleQcOnlyFilter();
                  onClose();
                }}
                className={cn(
                  'w-full min-h-[38px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer',
                  qcOnlyFilter ? 'bg-amber-600 text-white border-amber-600' : ''
                )}
                style={!qcOnlyFilter ? { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' } : undefined}
              >
                <AlertTriangle size={13} />
                <span>{qcOnlyFilter ? 'QC Filter: On' : 'QC Issues Only'}</span>
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
