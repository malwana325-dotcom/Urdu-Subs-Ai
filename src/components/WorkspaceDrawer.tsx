import React, { useState } from 'react';
import {
  X,
  Search,
  Lock,
  Unlock,
  Edit3,
  Replace,
  Wand2,
  Stamp,
  Plus,
  Clock,
  FoldHorizontal,
  RotateCcw,
  RefreshCw,
  Undo2,
  Redo2,
  Type as TypeIcon,
  Languages,
  Columns,
  Sliders,
  Activity,
  CheckSquare,
  Square,
  Filter,
  Trash2,
  LayoutGrid,
  Table2,
  Layers,
  List,
  AlertTriangle,
  Scissors,
} from 'lucide-react';
import { MobileSubtitleView } from '../services/appPreferences';
import { InfoPopover } from './InfoPopover';
import { RightEdgeDrawerShell } from './RightEdgeDrawerShell';
import { cn } from '../utils/cn';

interface WorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  searchInput: string;
  onChangeSearch: (val: string) => void;
  isReadOnly: boolean;
  onToggleReadOnly: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  filteredCount: number;
  selectedCount: number;
  untranslatedCount: number;
  onToggleSelectAll: () => void;
  onSelectUntranslated: () => void;
  onClearSelection: () => void;
  onOpenEditor: () => void;
  onRetrySelectedAI: () => void;
  onRetrySelectedGoogle: () => void;
  onRetrySelectedBoth: () => void;
  onClearSelectedAI: () => void;
  onClearSelectedGoogle: () => void;
  onClearSelectedBoth: () => void;
  onDeleteSelected: () => void;
  isTranslating: boolean;
  isGoogleTranslatingAll: boolean;
  onOpenFindReplace: () => void;
  onOpenTextCleanup: () => void;
  onSplitAllLong: () => void;
  onOpenWatermark: () => void;
  onAddSegment: () => void;
  onOpenTimeShift: () => void;
  onOpenGapTiming: () => void;
  onResetTimings: () => void;
  onResetBaseline: () => void;
  onRefreshTable: () => void;
  viewMode: MobileSubtitleView;
  onChangeViewMode: (mode: MobileSubtitleView) => void;
  visibleColumns: { time: boolean; original: boolean; ai: boolean; google: boolean };
  onChangeVisibleColumns: (next: { time: boolean; original: boolean; ai: boolean; google: boolean }) => void;
  onOpenTextResize: () => void;
  onOpenFonts: () => void;
  onOpenLanguageSettings: () => void;
  scriptBadge: string;
  aiProgress: number;
  googleProgress: number;
  onToggleWorkerMonitor: () => void;
  enableQcInspector: boolean;
  qcFilter: 'all' | 'issues' | 'high-cps' | 'overlaps' | 'untranslated';
  onChangeQcFilter: (next: 'all' | 'issues' | 'high-cps' | 'overlaps' | 'untranslated') => void;
  qcCounts: { total: number; totalIssues: number; highCpsCount: number; overlapCount: number; untranslatedCount: number };
}

export const WorkspaceDrawer: React.FC<WorkspaceDrawerProps> = ({
  isOpen,
  onClose,
  searchInput,
  onChangeSearch,
  isReadOnly,
  onToggleReadOnly,
  canUndo,
  canRedo,
  historyIndex,
  historyLength,
  onUndo,
  onRedo,
  filteredCount,
  selectedCount,
  untranslatedCount,
  onToggleSelectAll,
  onSelectUntranslated,
  onClearSelection,
  onOpenEditor,
  onRetrySelectedAI,
  onRetrySelectedGoogle,
  onRetrySelectedBoth,
  onClearSelectedAI,
  onClearSelectedGoogle,
  onClearSelectedBoth,
  onDeleteSelected,
  isTranslating,
  isGoogleTranslatingAll,
  onOpenFindReplace,
  onOpenTextCleanup,
  onSplitAllLong,
  onOpenWatermark,
  onAddSegment,
  onOpenTimeShift,
  onOpenGapTiming,
  onResetTimings,
  onResetBaseline,
  onRefreshTable,
  viewMode,
  onChangeViewMode,
  visibleColumns,
  onChangeVisibleColumns,
  onOpenTextResize,
  onOpenFonts,
  onOpenLanguageSettings,
  scriptBadge,
  aiProgress,
  googleProgress,
  onToggleWorkerMonitor,
  enableQcInspector,
  qcFilter,
  onChangeQcFilter,
  qcCounts,
}) => {

  return (
    <RightEdgeDrawerShell isOpen={isOpen} onClose={onClose} widthClass="w-[min(92vw,375px)]" roleVariant="edit">
        {/* Header */}
        <div
          className="px-3 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 mc-popup-header"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sliders size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mc-popup-title" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="text-xs font-semibold truncate mc-popup-title">Workspace Tools</h2>
                <InfoPopover
                  title="Workspace Tools Drawer"
                  description="All search, selection, editing, timing, column visibility, view layout, typography, and history utilities for the active subtitle table."
                  align="right"
                />
              </div>
              <p className="text-[10px] opacity-60 font-mono tabular-nums truncate">
                AI {aiProgress}% · G {googleProgress}% · {filteredCount} lines
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border flex items-center justify-center opacity-75 hover:opacity-100 cursor-pointer shrink-0"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            aria-label="Close drawer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Search & Read-Only */}
          <section className="space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => onChangeSearch(e.target.value)}
                placeholder="Search subtitles..."
                className="w-full min-h-[38px] pl-8 pr-7 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => onChangeSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer p-1"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleReadOnly}
                className={cn(
                  'min-h-[36px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap',
                  !isReadOnly ? 'text-white' : ''
                )}
                style={
                  isReadOnly
                    ? { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    : { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                }
              >
                {isReadOnly ? <Lock size={13} className="shrink-0" /> : <Unlock size={13} className="shrink-0" />}
                <span className="truncate">{isReadOnly ? 'Locked' : 'Unlocked'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditor();
                }}
                className="min-h-[36px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                <Edit3 size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                <span className="truncate">Studio</span>
              </button>
            </div>
          </section>

          {/* Typography & Language */}
          <section
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-65">
              Typography & Script
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTextResize();
                }}
                className="min-h-[38px] px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer touch-tactile"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <TypeIcon size={13} style={{ color: 'var(--theme-accent)' }} />
                <span>Size</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFonts();
                }}
                className="min-h-[38px] px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer touch-tactile"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <Languages size={13} style={{ color: 'var(--theme-accent)' }} />
                <span>Fonts</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLanguageSettings();
                }}
                className="min-h-[38px] px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer touch-tactile"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <Sliders size={12} style={{ color: 'var(--theme-accent)' }} />
                <span className="font-mono text-[11px]">{scriptBadge}</span>
              </button>
            </div>
          </section>

          {/* View Mode & Columns */}
          <section
            className="rounded-xl border p-2.5 space-y-2.5"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <Columns size={12} style={{ color: 'var(--theme-accent)' }} />
              Layout & Columns
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'table', label: 'Table', icon: Table2 },
                  { id: 'cards', label: 'Cards', icon: LayoutGrid },
                  { id: 'stream-switch', label: 'Switch', icon: Layers },
                  { id: 'compact', label: 'Compact', icon: List },
                ] as const
              ).map((v) => {
                const Icon = v.icon;
                const active = viewMode === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onChangeViewMode(v.id)}
                    className={cn(
                      'min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer btn-inch-cap',
                      active ? 'text-white' : 'opacity-80'
                    )}
                    style={
                      active
                        ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    <Icon size={12} className="shrink-0" />
                    <span className="truncate">{v.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--theme-border)' }}>
              {[
                { key: 'time' as const, label: 'Time & CPS' },
                { key: 'original' as const, label: 'Original' },
                { key: 'ai' as const, label: 'AI Translation' },
                { key: 'google' as const, label: 'Google' },
              ].map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 min-h-[34px] px-2 rounded-lg border text-[11px] font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key]}
                    onChange={(e) =>
                      onChangeVisibleColumns({ ...visibleColumns, [col.key]: e.target.checked })
                    }
                    className="rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Edit & Timing Utilities */}
          <section
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-65">
              Edit & Timing Utilities
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Split ≤2L', icon: Scissors, action: onSplitAllLong },
                { label: 'Replace', icon: Replace, action: onOpenFindReplace },
                { label: 'Cleanup', icon: Wand2, action: onOpenTextCleanup },
                { label: 'Mark', icon: Stamp, action: onOpenWatermark },
                { label: 'Add', icon: Plus, action: onAddSegment },
                { label: 'Shift', icon: Clock, action: onOpenTimeShift },
                { label: 'Gaps', icon: FoldHorizontal, action: onOpenGapTiming },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    onClick={() => {
                      onClose();
                      tool.action();
                    }}
                    className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer text-left touch-tactile btn-inch-cap"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    <Icon size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                    <span className="truncate">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Selection & Batch Actions */}
          <section
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider opacity-65">
              <span>Selection</span>
              <span className="font-mono tabular-nums">{selectedCount} selected</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onToggleSelectAll}
                disabled={filteredCount === 0}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                {selectedCount === filteredCount && filteredCount > 0 ? (
                  <CheckSquare size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                ) : (
                  <Square size={12} className="shrink-0" />
                )}
                <span className="truncate">{selectedCount === filteredCount && filteredCount > 0 ? 'None' : 'All'}</span>
              </button>

              <button
                type="button"
                onClick={onSelectUntranslated}
                disabled={filteredCount === 0}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer tabular-nums btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <Filter size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                <span className="truncate">Todo ({untranslatedCount})</span>
              </button>
            </div>

            {selectedCount > 0 && (
              <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => { onClose(); onRetrySelectedAI(); }}
                    disabled={isTranslating}
                    className="min-h-[32px] px-1.5 rounded-md border text-[10.5px] font-semibold cursor-pointer disabled:opacity-45"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    Retry AI
                  </button>
                  <button
                    type="button"
                    onClick={() => { onClose(); onRetrySelectedGoogle(); }}
                    disabled={isGoogleTranslatingAll}
                    className="min-h-[32px] px-1.5 rounded-md border text-[10.5px] font-semibold cursor-pointer disabled:opacity-45"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    Retry G
                  </button>
                  <button
                    type="button"
                    onClick={() => { onClose(); onRetrySelectedBoth(); }}
                    disabled={isTranslating || isGoogleTranslatingAll}
                    className="min-h-[32px] px-1.5 rounded-md border text-[10.5px] font-semibold cursor-pointer disabled:opacity-45"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    Retry Both
                  </button>
                  <button
                    type="button"
                    onClick={onClearSelectedAI}
                    className="min-h-[32px] px-1.5 rounded-md border text-[10.5px] font-semibold cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    Clear AI
                  </button>
                  <button
                    type="button"
                    onClick={onClearSelectedGoogle}
                    className="min-h-[32px] px-1.5 rounded-md border text-[10.5px] font-semibold cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    Clear G
                  </button>
                  <button
                    type="button"
                    onClick={onClearSelectedBoth}
                    className="min-h-[32px] px-1.5 rounded-md border text-[10.5px] font-semibold cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDeleteSelected();
                    }}
                    className="min-h-[34px] px-2.5 rounded-md border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer text-red-500 btn-inch-cap"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    <Trash2 size={12} className="shrink-0" />
                    <span className="truncate">Delete ({selectedCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onClearSelection()}
                    className="min-h-[34px] px-2.5 rounded-md border text-[11px] font-semibold cursor-pointer btn-inch-cap"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* QC Filter (when enabled) */}
          {enableQcInspector && qcCounts.total > 0 && (
            <section
              className="rounded-xl border p-2.5 space-y-2"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <div className="text-[10.5px] font-semibold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-500" />
                QC Filter
              </div>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'all', label: `All (${qcCounts.total})` },
                    { id: 'issues', label: `Issues (${qcCounts.totalIssues})` },
                    { id: 'high-cps', label: `CPS (${qcCounts.highCpsCount})` },
                    { id: 'overlaps', label: `Overlap (${qcCounts.overlapCount})` },
                    { id: 'untranslated', label: `Todo (${qcCounts.untranslatedCount})` },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => onChangeQcFilter(pill.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[10.5px] font-semibold border cursor-pointer tabular-nums',
                      qcFilter === pill.id ? 'text-white' : 'opacity-80'
                    )}
                    style={
                      qcFilter === pill.id
                        ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* History & Reset */}
          <section
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider opacity-65">
              <span>History & Maintenance</span>
              <span className="font-mono tabular-nums">
                {Math.max(0, historyIndex)}/{Math.max(0, historyLength - 1)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-35 cursor-pointer btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <Undo2 size={12} />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-35 cursor-pointer btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <Redo2 size={12} />
                <span>Redo</span>
              </button>
              <button
                type="button"
                onClick={() => { onResetTimings(); onClose(); }}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <Clock size={11} className="shrink-0" />
                <span className="truncate">Timings</span>
              </button>
              <button
                type="button"
                onClick={() => { onRefreshTable(); onClose(); }}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <RefreshCw size={11} className="shrink-0" />
                <span className="truncate">Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => { onToggleWorkerMonitor(); onClose(); }}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <Activity size={11} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                <span className="truncate">Workers</span>
              </button>
              <button
                type="button"
                onClick={() => { onResetBaseline(); onClose(); }}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-medium text-red-500 flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <RotateCcw size={11} className="shrink-0" />
                <span className="truncate">Baseline</span>
              </button>
            </div>
          </section>
        </div>
    </RightEdgeDrawerShell>
  );
};
