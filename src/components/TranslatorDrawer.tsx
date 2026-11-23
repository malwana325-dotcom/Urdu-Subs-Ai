import React from 'react';
import {
  X,
  Activity,
  Sparkles,
  Languages,
  Square,
  Sliders,
  Gauge,
  Cpu,
  Globe,
  Loader2,
} from 'lucide-react';
import {
  TranslationSettings,
  TARGET_LANGUAGES,
  SCRIPT_MODES,
} from '../services/translationSettings';
import { InfoPopover } from './InfoPopover';
import { RightEdgeDrawerShell } from './RightEdgeDrawerShell';
import { cn } from '../utils/cn';

const GEMINI_MODELS = [
  { id: 'gemini-4-hydrogen', name: 'Gemini 4 Hydrogen / Flash' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-4-neon', name: 'Gemini 4 Neon / Pro' },
  { id: 'gemini-4-carbon', name: 'Gemini 4 Carbon' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
];

interface TranslatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subtitlesCount: number;
  translatedCount: number;
  googleCount: number;
  isTranslating: boolean;
  isGoogleTranslatingAll: boolean;
  translationSpeed: number;
  selectedModel: string;
  onUpdateModel: (model: string) => void;
  geminiWorkers: number;
  onUpdateGeminiWorkers: (val: number) => void;
  geminiBatchSize: number;
  onUpdateGeminiBatchSize: (val: number) => void;
  geminiDelay: number;
  onUpdateGeminiDelay: (val: number) => void;
  googleWorkers: number;
  onUpdateGoogleWorkers: (val: number) => void;
  googleBatchSize: number;
  onUpdateGoogleBatchSize: (val: number) => void;
  adaptiveScalingEnabled: boolean;
  onToggleAdaptiveScaling: (enabled: boolean) => void;
  activeAdaptiveInfo: {
    workers: number;
    delay: number;
    throttled: boolean;
    reason?: string;
  };
  workerStates: Record<string, { id: number; status: 'idle' | 'working' | 'completed'; currentItem?: number }>;
  translationSettings: TranslationSettings;
  onUpdateTranslationSettings: (next: TranslationSettings) => void;
  onStartTranslation: () => void;
  onStopTranslation: () => void;
  onStartGoogleTranslate: () => void;
  onStopGoogleTranslate: () => void;
  onOpenFullSettings: () => void;
}

export const TranslatorDrawer: React.FC<TranslatorDrawerProps> = ({
  isOpen,
  onClose,
  subtitlesCount,
  translatedCount,
  googleCount,
  isTranslating,
  isGoogleTranslatingAll,
  translationSpeed,
  selectedModel,
  onUpdateModel,
  geminiWorkers,
  onUpdateGeminiWorkers,
  geminiBatchSize,
  onUpdateGeminiBatchSize,
  geminiDelay,
  onUpdateGeminiDelay,
  googleWorkers,
  onUpdateGoogleWorkers,
  googleBatchSize,
  onUpdateGoogleBatchSize,
  adaptiveScalingEnabled,
  onToggleAdaptiveScaling,
  activeAdaptiveInfo,
  workerStates,
  translationSettings,
  onUpdateTranslationSettings,
  onStartTranslation,
  onStopTranslation,
  onStartGoogleTranslate,
  onStopGoogleTranslate,
  onOpenFullSettings,
}) => {
  const aiPending = Math.max(0, subtitlesCount - translatedCount);
  const aiPercent = subtitlesCount > 0 ? Math.round((translatedCount / subtitlesCount) * 100) : 0;
  const googlePercent = subtitlesCount > 0 ? Math.round((googleCount / subtitlesCount) * 100) : 0;
  const etaSeconds =
    isTranslating && translationSpeed > 0 && aiPending > 0
      ? Math.ceil(aiPending / translationSpeed)
      : null;

  const workerEntries = Object.values(workerStates) as Array<{
    id: number;
    status: 'idle' | 'working' | 'completed';
    currentItem?: number;
  }>;
  const activeWorkersCount = workerEntries.filter((w) => w.status === 'working').length;

  return (
    <RightEdgeDrawerShell isOpen={isOpen} onClose={onClose} widthClass="w-[min(92vw,380px)]">
        {/* Header */}
        <div
          className="px-3 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Activity size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="text-xs font-semibold truncate">Progress & Parameters</h2>
                <InfoPopover
                  title="Translation Monitor & Tuning"
                  description="Track live Gemini AI and Google Translate progress, active workers, ETA, and tune batch concurrency in real time."
                  align="right"
                />
              </div>
              <p className="text-[10px] opacity-60 font-mono tabular-nums truncate">
                {aiPercent}% AI · {googlePercent}% Google
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Live Progress Card */}
          <section
            className="rounded-xl border p-2.5 space-y-2.5"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1.5">
                <Gauge size={13} style={{ color: 'var(--theme-accent)' }} />
                Live Progress
              </span>
              <span className="font-mono text-[10px] opacity-70 tabular-nums">
                {isTranslating ? `${translationSpeed} lines/s` : 'Idle'}
                {etaSeconds !== null ? ` · ~${etaSeconds}s ETA` : ''}
              </span>
            </div>

            {/* AI Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10.5px] font-mono tabular-nums">
                <span>Gemini AI</span>
                <span>
                  {translatedCount}/{subtitlesCount} ({aiPercent}%) · {aiPending} left
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                <div
                  className="h-full transition-all duration-200"
                  style={{ width: `${aiPercent}%`, backgroundColor: 'var(--theme-accent)' }}
                />
              </div>
            </div>

            {/* Google Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10.5px] font-mono tabular-nums">
                <span>Google Translate</span>
                <span>
                  {googleCount}/{subtitlesCount} ({googlePercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                <div
                  className="h-full transition-all duration-200 bg-sky-500"
                  style={{ width: `${googlePercent}%` }}
                />
              </div>
            </div>

            {/* Worker Grid */}
            {workerEntries.length > 0 && (
              <div className="pt-1.5 border-t space-y-1.5" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center justify-between text-[10px] opacity-70 font-mono tabular-nums">
                  <span>Workers ({activeWorkersCount}/{workerEntries.length} active)</span>
                  {adaptiveScalingEnabled && (
                    <span>
                      {activeAdaptiveInfo.throttled ? 'Throttled · ' : ''}
                      {activeAdaptiveInfo.workers}w · {activeAdaptiveInfo.delay}ms
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {workerEntries.map((w) => (
                    <div
                      key={w.id}
                      className="px-1.5 py-1 rounded border text-[9.5px] font-mono tabular-nums flex items-center justify-between"
                      style={{
                        backgroundColor:
                          w.status === 'working' ? 'var(--theme-accent-soft)' : 'var(--theme-surface)',
                        borderColor:
                          w.status === 'working' ? 'var(--theme-accent)' : 'var(--theme-border)',
                      }}
                    >
                      <span>W{w.id}</span>
                      <span className="opacity-75">
                        {w.status === 'working'
                          ? `#${w.currentItem ?? '...'}`
                          : w.status === 'completed'
                          ? 'Done'
                          : 'Idle'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Run Controls */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {isTranslating ? (
                <button
                  type="button"
                  onClick={onStopTranslation}
                  className="min-h-[36px] px-2.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                >
                  <Square size={12} className="shrink-0" />
                  <span className="truncate tabular-nums">Stop AI ({aiPercent}%)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartTranslation}
                  disabled={subtitlesCount === 0}
                  className="relative overflow-hidden min-h-[36px] px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-45 cursor-pointer btn-inch-cap"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-300"
                    style={{ width: `${aiPercent}%` }}
                  />
                  <span className="relative z-10 flex items-center gap-1">
                    {subtitlesCount > 0 && aiPending === 0 ? (
                      <span aria-label="Completed">✅</span>
                    ) : (
                      <Sparkles size={12} className="shrink-0" />
                    )}
                    <span className="truncate tabular-nums">
                      {subtitlesCount > 0 && aiPending === 0
                        ? 'AI 100%'
                        : translatedCount > 0
                        ? `AI ${aiPercent}%`
                        : 'Start AI'}
                    </span>
                  </span>
                </button>
              )}

              {isGoogleTranslatingAll ? (
                <button
                  type="button"
                  onClick={onStopGoogleTranslate}
                  className="min-h-[36px] px-2.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                >
                  <Loader2 size={12} className="animate-spin shrink-0" />
                  <span className="truncate tabular-nums">Stop ({googlePercent}%)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartGoogleTranslate}
                  disabled={subtitlesCount === 0}
                  className="relative overflow-hidden min-h-[36px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-45 cursor-pointer btn-inch-cap"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-sky-500/20 transition-all duration-300"
                    style={{ width: `${googlePercent}%` }}
                  />
                  <span className="relative z-10 flex items-center gap-1">
                    {subtitlesCount > 0 && googleCount === subtitlesCount ? (
                      <span aria-label="Completed">✅</span>
                    ) : (
                      <Languages size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                    )}
                    <span className="truncate tabular-nums">
                      {googleCount > 0 ? `Neutral ${googlePercent}%` : 'Neutral'}
                    </span>
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Language, Script & Model Parameters */}
          <section
            className="rounded-xl border p-2.5 space-y-2.5"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <Globe size={13} style={{ color: 'var(--theme-accent)' }} />
                Language & Model
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullSettings();
                }}
                className="text-[10.5px] font-semibold cursor-pointer hover:underline"
                style={{ color: 'var(--theme-accent-text)' }}
              >
                All Rules
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <label className="text-[10.5px] opacity-70 font-medium">Gemini Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => onUpdateModel(e.target.value)}
                  className="w-full min-h-[36px] px-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10.5px] opacity-70 font-medium">Target</label>
                  <select
                    value={translationSettings.targetLanguage}
                    onChange={(e) =>
                      onUpdateTranslationSettings({
                        ...translationSettings,
                        targetLanguage: e.target.value,
                      })
                    }
                    className="w-full min-h-[36px] px-2 rounded-lg border text-xs"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)',
                    }}
                  >
                    {TARGET_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] opacity-70 font-medium">Script</label>
                  <select
                    value={translationSettings.scriptMode}
                    onChange={(e) =>
                      onUpdateTranslationSettings({
                        ...translationSettings,
                        scriptMode: e.target.value as any,
                      })
                    }
                    className="w-full min-h-[36px] px-2 rounded-lg border text-xs"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-text)',
                    }}
                  >
                    {SCRIPT_MODES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Engine Concurrency & Batch Parameters */}
          <section
            className="rounded-xl border p-2.5 space-y-2.5"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <Cpu size={13} style={{ color: 'var(--theme-accent)' }} />
                Concurrency & Batches
              </span>
              <label className="flex items-center gap-1.5 text-[10.5px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={adaptiveScalingEnabled}
                  onChange={(e) => onToggleAdaptiveScaling(e.target.checked)}
                  className="w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span>Adaptive</span>
              </label>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Gemini Workers</span>
                  <span className="font-mono font-semibold tabular-nums">{geminiWorkers}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={geminiWorkers}
                  onChange={(e) => onUpdateGeminiWorkers(Number(e.target.value))}
                  className="w-full h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Gemini Batch Size</span>
                  <span className="font-mono font-semibold tabular-nums">{geminiBatchSize} lines</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={geminiBatchSize}
                  onChange={(e) => onUpdateGeminiBatchSize(Number(e.target.value))}
                  className="w-full h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Batch Delay</span>
                  <span className="font-mono font-semibold tabular-nums">{geminiDelay}ms</span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={4000}
                  step={100}
                  value={geminiDelay}
                  onChange={(e) => onUpdateGeminiDelay(Number(e.target.value))}
                  className="w-full h-1.5 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t grid grid-cols-2 gap-2" style={{ borderColor: 'var(--theme-border)' }}>
                <div>
                  <div className="flex justify-between text-[10.5px] mb-1">
                    <span>Google Workers</span>
                    <span className="font-mono font-semibold tabular-nums">{googleWorkers}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={googleWorkers}
                    onChange={(e) => onUpdateGoogleWorkers(Number(e.target.value))}
                    className="w-full h-1.5 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10.5px] mb-1">
                    <span>Google Batch</span>
                    <span className="font-mono font-semibold tabular-nums">{googleBatchSize}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={googleBatchSize}
                    onChange={(e) => onUpdateGoogleBatchSize(Number(e.target.value))}
                    className="w-full h-1.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullSettings();
              }}
              className="min-h-[36px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <Sliders size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="truncate">Settings</span>
            </button>
          </div>
        </div>
    </RightEdgeDrawerShell>
  );
};
