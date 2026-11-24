import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Languages,
  Loader2,
  Sliders,
  Cpu,
  Search,
  SearchCode,
  MessageSquare,
  RotateCcw,
  Activity,
  Plus,
  Trash2,
  BookOpen,
  Check,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  Gauge,
  Square,
} from 'lucide-react';
import { GeminiQuotaDashboard } from './GeminiQuotaDashboard';
import { InfoPopover } from './InfoPopover';
import { FormattedRichText } from './FormattedRichText';
import { GlossaryEntry } from '../services/appPreferences';
import { registerBackHandler } from '../utils/backNavigation';
import {
  TranslationSettings,
  TARGET_LANGUAGES,
  SCRIPT_MODES,
  TONE_REGISTERS,
  HONORIFIC_OPTIONS,
} from '../services/translationSettings';
import { cn } from '../utils/cn';

interface TranslatorTabViewProps {
  subtitlesCount: number;
  translatedCount: number;
  googleCount: number;
  untranslatedCount: number;
  isTranslating: boolean;
  isGoogleTranslatingAll: boolean;
  translationSpeed: number;
  isGeminiConnected: boolean;
  selectedModel: string;
  geminiWorkers: number;
  geminiBatchSize: number;
  geminiDelay: number;
  googleWorkers: number;
  googleBatchSize: number;
  adaptiveScalingEnabled: boolean;
  activeAdaptiveInfo: {
    workers: number;
    delay: number;
    throttled: boolean;
    reason?: string;
  };
  onToggleAdaptiveScaling: (enabled: boolean) => void;
  onUpdateWorkers: (workers: number) => void;
  onUpdateBatchSize: (size: number) => void;
  translationSettings: TranslationSettings;
  context: string;
  customPrompt: string;
  analyzeStatus: 'idle' | 'loading' | 'success' | 'failed';
  isGeneratingContext: boolean;
  workerStates: Record<string, { id: number; status: 'idle' | 'working' | 'completed'; currentItem?: number }>;
  isWorkerMonitorOpen: boolean;
  onToggleWorkerMonitor: () => void;
  onStopTranslation: () => void;
  onStopGoogleTranslate: () => void;
  onOpenTranslationSettings: () => void;
  onOpenAiConfig: () => void;
  onOpenGoogleConfig: () => void;
  onAnalyzeSubtitles: () => void;
  onChangeContext: (val: string) => void;
  onChangeCustomPrompt: (val: string) => void;
  onRestoreDefaultPrompt: () => void;
  enableTermGlossary: boolean;
  glossary: GlossaryEntry[];
  onChangeGlossary: (entries: GlossaryEntry[]) => void;
}

export const TranslatorTabView: React.FC<TranslatorTabViewProps> = ({
  subtitlesCount,
  translatedCount,
  googleCount,
  untranslatedCount,
  isTranslating,
  isGoogleTranslatingAll,
  translationSpeed,
  selectedModel,
  geminiWorkers,
  geminiBatchSize,
  geminiDelay,
  googleWorkers,
  googleBatchSize,
  adaptiveScalingEnabled,
  activeAdaptiveInfo,
  onToggleAdaptiveScaling,
  onUpdateWorkers,
  onUpdateBatchSize,
  translationSettings,
  context,
  customPrompt,
  analyzeStatus,
  isGeneratingContext,
  workerStates,
  isWorkerMonitorOpen,
  onToggleWorkerMonitor,
  onStopTranslation,
  onStopGoogleTranslate,
  onOpenTranslationSettings,
  onOpenAiConfig,
  onOpenGoogleConfig,
  onAnalyzeSubtitles,
  onChangeContext,
  onChangeCustomPrompt,
  onRestoreDefaultPrompt,
  enableTermGlossary,
  glossary,
  onChangeGlossary,
}) => {
  const [sourceTermInput, setSourceTermInput] = useState('');
  const [targetTermInput, setTargetTermInput] = useState('');
  const [contextEditMode, setContextEditMode] = useState(false);
  const [instructionsEditMode, setInstructionsEditMode] = useState(false);
  const [openSections, setOpenSections] = useState<{
    context: boolean;
    instructions: boolean;
    glossary: boolean;
  }>({
    context: true,
    instructions: false,
    glossary: false,
  });

  useEffect(() => {
    return registerBackHandler(() => {
      if (contextEditMode) {
        setContextEditMode(false);
        return true;
      }
      if (instructionsEditMode) {
        setInstructionsEditMode(false);
        return true;
      }
      if (isWorkerMonitorOpen) {
        onToggleWorkerMonitor();
        return true;
      }
      return false;
    });
  }, [contextEditMode, instructionsEditMode, isWorkerMonitorOpen, onToggleWorkerMonitor]);

  const handleAddGlossaryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTermInput.trim() || !targetTermInput.trim()) return;
    const entry: GlossaryEntry = {
      id: `gloss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceTerm: sourceTermInput.trim(),
      targetTranslation: targetTermInput.trim(),
      enabled: true,
    };
    onChangeGlossary([entry, ...glossary]);
    setSourceTermInput('');
    setTargetTermInput('');
  };

  const langObj = TARGET_LANGUAGES.find((l) => l.code === translationSettings.targetLanguage);
  const scriptObj = SCRIPT_MODES.find((s) => s.id === translationSettings.scriptMode);
  const toneObj = TONE_REGISTERS.find((t) => t.id === translationSettings.toneRegister);
  const honorificObj = HONORIFIC_OPTIONS.find((h) => h.id === translationSettings.honorificRegister);

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
    <div className="space-y-3 max-w-5xl mx-auto w-full pb-36">
      {/* Primary Translation Status & Engine Links (Primary action buttons stacked bottom-right) */}
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
            <Sparkles size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <h2 className="text-xs sm:text-sm font-semibold truncate">Translation Engines</h2>
            <InfoPopover
              title="AI & Machine Engines"
              description="Run Gemini AI dubbing or Neutral machine comparison. Configure language, tone, and worker limits in Settings."
              align="left"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono opacity-65 tabular-nums">
              {translatedCount}/{subtitlesCount} AI · {googleCount}/{subtitlesCount} Neutral
            </span>
            {(isTranslating || isGoogleTranslatingAll) && (
              <button
                type="button"
                onClick={onToggleWorkerMonitor}
                className="min-h-[32px] px-2 rounded-lg border text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer tabular-nums"
                style={{
                  backgroundColor: 'var(--theme-accent-soft)',
                  borderColor: 'var(--theme-accent)',
                  color: 'var(--theme-accent-text)',
                }}
              >
                <Activity size={12} />
                <span>{translationSpeed}/s</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile & Config Quick Links */}
        <div
          className="pt-2 border-t flex flex-wrap items-center justify-between gap-2"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <span className="text-[11px] opacity-75 truncate">
            {langObj?.name || 'Urdu'} · {scriptObj?.badge || 'اردو'} · {toneObj?.label} · {honorificObj?.label}
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onOpenTranslationSettings}
              className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <Sliders size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="truncate">Language</span>
            </button>
            <button
              type="button"
              onClick={onOpenAiConfig}
              className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              title={`Model: ${selectedModel} (${geminiWorkers}w/${geminiBatchSize}b)`}
            >
              <Cpu size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="tabular-nums truncate">AI {geminiWorkers}w</span>
            </button>
            <button
              type="button"
              onClick={onOpenGoogleConfig}
              className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              title={`Neutral Workers: ${googleWorkers}w/${googleBatchSize}b`}
            >
              <Languages size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="tabular-nums truncate">N {googleWorkers}w</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Worker Monitor */}
      {isWorkerMonitorOpen && Object.keys(workerStates).length > 0 && (
        <div
          className="rounded-xl border p-3 space-y-2 theme-card"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Activity size={13} style={{ color: 'var(--theme-accent)' }} />
              <span>Workers</span>
            </span>
            <button
              type="button"
              onClick={onToggleWorkerMonitor}
              className="w-7 h-7 rounded-md flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="Close workers"
            >
              <X size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {Object.entries(workerStates).map(([key, st]) => (
              <div
                key={key}
                className="px-2 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between tabular-nums"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                <span className="truncate opacity-70">{key.replace('-worker-', ' #')}</span>
                <span className="font-semibold">
                  {st.currentItem ? `#${st.currentItem}` : st.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gemini Quota & Rate Analytics */}
      <GeminiQuotaDashboard
        isTranslating={isTranslating}
        subtitlesCount={subtitlesCount}
        untranslatedCount={untranslatedCount}
        geminiBatchSize={geminiBatchSize}
        geminiWorkers={geminiWorkers}
        geminiDelay={geminiDelay}
        hasContext={Boolean(context && context.length > 50)}
        adaptiveScalingEnabled={adaptiveScalingEnabled}
        onToggleAdaptiveScaling={onToggleAdaptiveScaling}
        activeAdaptiveInfo={activeAdaptiveInfo}
        onUpdateWorkers={onUpdateWorkers}
        onUpdateBatchSize={onUpdateBatchSize}
      />

      {/* Cultural Context (entire title header row toggles expand/collapse + renders all rich text formats) */}
      <div
        className="rounded-xl border theme-card overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpenSections((s) => ({ ...s, context: !s.context }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpenSections((s) => ({ ...s, context: !s.context }));
            }
          }}
          className="px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:opacity-90"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {openSections.context ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
            <Search size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <span className="text-xs font-semibold truncate">Cultural Context</span>
          </div>

          <div
            className="flex items-center gap-1.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {openSections.context && (
              <button
                type="button"
                onClick={() => setContextEditMode((m) => !m)}
                className="min-h-[32px] px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title={contextEditMode ? 'View formatted preview' : 'Edit context'}
              >
                {contextEditMode ? <Eye size={12} /> : <Edit3 size={12} />}
                <span>{contextEditMode ? 'View' : 'Edit'}</span>
              </button>
            )}
            <InfoPopover
              title="AI Cultural Context"
              description="Analyzes dialogue for character genders, tone, and relationships to keep translations natural."
              align="right"
            />
            <button
              type="button"
              onClick={onAnalyzeSubtitles}
              disabled={isGeneratingContext || subtitlesCount === 0}
              className={cn(
                'min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-45 touch-tactile text-white btn-inch-cap',
                analyzeStatus === 'failed' && 'bg-red-600'
              )}
              style={analyzeStatus === 'failed' ? undefined : { backgroundColor: 'var(--theme-accent)' }}
            >
              {analyzeStatus === 'loading' ? (
                <Loader2 size={12} className="animate-spin shrink-0" />
              ) : analyzeStatus === 'success' ? (
                <Check size={12} className="shrink-0" />
              ) : analyzeStatus === 'failed' ? (
                <AlertCircle size={12} className="shrink-0" />
              ) : (
                <SearchCode size={12} className="shrink-0" />
              )}
              <span className="truncate">
                {analyzeStatus === 'loading'
                  ? 'Analyzing'
                  : analyzeStatus === 'success'
                  ? 'Analyzed'
                  : 'Analyze'}
              </span>
            </button>
          </div>
        </div>

        {openSections.context && (
          <div className="px-3 pb-3 pt-2 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {contextEditMode ? (
              <textarea
                value={context}
                onChange={(e) => onChangeContext(e.target.value)}
                rows={5}
                placeholder="Genre, characters, relationships (supports Markdown, bold, lists, RTL/LTR)..."
                className="w-full p-2.5 rounded-lg border text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
            ) : (
              <div
                onClick={() => setContextEditMode(true)}
                className="w-full p-2.5 rounded-lg border max-h-60 overflow-y-auto overscroll-contain cursor-text"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }}
                title="Tap to edit Cultural Context"
              >
                <FormattedRichText
                  text={context}
                  placeholder="No cultural context yet. Tap Analyze or tap here to add character notes, genre, and relationships."
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Instructions (entire title header row toggles expand/collapse + supports rich text preview) */}
      <div
        className="rounded-xl border theme-card overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpenSections((s) => ({ ...s, instructions: !s.instructions }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpenSections((s) => ({ ...s, instructions: !s.instructions }));
            }
          }}
          className="px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:opacity-90"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {openSections.instructions ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
            <MessageSquare size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <span className="text-xs font-semibold truncate">Instructions</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {openSections.instructions && (
              <button
                type="button"
                onClick={() => setInstructionsEditMode((m) => !m)}
                className="min-h-[32px] px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                {instructionsEditMode ? <Eye size={12} /> : <Edit3 size={12} />}
                <span>{instructionsEditMode ? 'View' : 'Edit'}</span>
              </button>
            )}
            <InfoPopover
              title="Custom AI Rules"
              description="Directives passed to Gemini with every batch (slang, honorifics, idioms)."
              align="right"
            />
            <button
              type="button"
              onClick={onRestoreDefaultPrompt}
              className="min-h-[32px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <RotateCcw size={11} className="shrink-0" />
              <span className="truncate">Default</span>
            </button>
          </div>
        </div>

        {openSections.instructions && (
          <div className="px-3 pb-3 pt-2 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {instructionsEditMode ? (
              <textarea
                value={customPrompt}
                onChange={(e) => onChangeCustomPrompt(e.target.value)}
                rows={4}
                placeholder="Custom translation style rules..."
                className="w-full p-2.5 rounded-lg border text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
            ) : (
              <div
                onClick={() => setInstructionsEditMode(true)}
                className="w-full p-2.5 rounded-lg border max-h-48 overflow-y-auto overscroll-contain cursor-text"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                <FormattedRichText
                  text={customPrompt}
                  placeholder="No custom instructions yet. Tap here to write rules."
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Character & Term Glossary (entire header row toggles expand/collapse) */}
      {enableTermGlossary && (
        <div
          className="rounded-xl border theme-card overflow-hidden"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpenSections((s) => ({ ...s, glossary: !s.glossary }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpenSections((s) => ({ ...s, glossary: !s.glossary }));
              }
            }}
            className="px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:opacity-90"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {openSections.glossary ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
              <BookOpen size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="text-xs font-semibold truncate">Glossary</span>
              <span className="text-[11px] font-mono opacity-55 tabular-nums">
                · {glossary.filter((g) => g.enabled).length}
              </span>
            </div>

            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              <InfoPopover
                title="Term Glossary"
                description="Lock exact translations for character names, places, and recurring terms."
                align="right"
              />
            </div>
          </div>

          {openSections.glossary && (
            <div className="px-3 pb-3 pt-2 border-t space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
              <form onSubmit={handleAddGlossaryEntry} className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                <input
                  type="text"
                  value={sourceTermInput}
                  onChange={(e) => setSourceTermInput(e.target.value)}
                  placeholder="Source term"
                  className="sm:col-span-5 min-h-[38px] px-2.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                />
                <input
                  type="text"
                  value={targetTermInput}
                  onChange={(e) => setTargetTermInput(e.target.value)}
                  placeholder="Exact translation"
                  dir="auto"
                  className="sm:col-span-5 min-h-[38px] px-2.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                />
                <button
                  type="submit"
                  className="sm:col-span-2 min-h-[38px] px-3 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer touch-tactile btn-inch-cap"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                >
                  <Plus size={14} className="shrink-0" />
                  <span className="truncate">Add</span>
                </button>
              </form>

              {glossary.length > 0 && (
                <div className="divide-y max-h-48 overflow-y-auto border-t" style={{ borderColor: 'var(--theme-border)' }}>
                  {glossary.map((item) => (
                    <div key={item.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                      <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() =>
                            onChangeGlossary(
                              glossary.map((g) => (g.id === item.id ? { ...g, enabled: !g.enabled } : g))
                            )
                          }
                          className="rounded w-3.5 h-3.5 shrink-0"
                        />
                        <span className="font-medium truncate">{item.sourceTerm}</span>
                        <span className="opacity-40">→</span>
                        <span className="font-urdu text-sm truncate" dir="auto">
                          {item.targetTranslation}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => onChangeGlossary(glossary.filter((g) => g.id !== item.id))}
                        className="w-7 h-7 rounded-md text-red-500 hover:bg-red-500/10 flex items-center justify-center cursor-pointer"
                        aria-label="Delete term"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress Tracking Bar (Bottom of Translation Tab) */}
      <section
        className="rounded-xl border space-y-2.5 theme-card"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
          <div className="flex items-center gap-1.5 min-w-0">
            <Gauge size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <span className="truncate">Live Progress</span>
            <InfoPopover
              title="Translation Progress"
              description="Live Gemini AI and Neutral progress, active workers, and ETA. Swipe left from the right edge to open the parameters drawer."
              align="left"
            />
          </div>
          <span className="font-mono text-[10.5px] opacity-75 tabular-nums shrink-0">
            {isTranslating || isGoogleTranslatingAll ? `${translationSpeed} lines/s` : 'Idle'}
            {etaSeconds !== null ? ` · ~${etaSeconds}s ETA` : ''}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono tabular-nums">
            <span>Gemini AI</span>
            <span>
              {translatedCount}/{subtitlesCount} ({aiPercent}%) · {aiPending} left
            </span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden bg-black/15 dark:bg-white/10">
            <div
              className="h-full transition-all duration-200"
              style={{ width: `${aiPercent}%`, backgroundColor: 'var(--theme-accent)' }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono tabular-nums">
            <span>Neutral / Google</span>
            <span>
              {googleCount}/{subtitlesCount} ({googlePercent}%)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-black/15 dark:bg-white/10">
            <div
              className="h-full transition-all duration-200 bg-sky-400"
              style={{ width: `${googlePercent}%` }}
            />
          </div>
        </div>

        {workerEntries.length > 0 && (
          <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="flex items-center justify-between text-[10.5px] opacity-75 font-mono tabular-nums">
              <span>Workers ({activeWorkersCount}/{workerEntries.length} active)</span>
              {adaptiveScalingEnabled && (
                <span>
                  {activeAdaptiveInfo.throttled ? 'Throttled · ' : ''}
                  {activeAdaptiveInfo.workers}w · {activeAdaptiveInfo.delay}ms
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {workerEntries.map((w) => (
                <div
                  key={w.id}
                  className="px-2 py-1 rounded border text-[10px] font-mono tabular-nums flex items-center justify-between"
                  style={{
                    backgroundColor:
                      w.status === 'working' ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
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

        {(isTranslating || isGoogleTranslatingAll) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isTranslating && (
              <button
                type="button"
                onClick={onStopTranslation}
                className="min-h-[36px] px-3 rounded-lg bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile"
              >
                <Square size={12} className="shrink-0" />
                <span className="tabular-nums">Stop AI ({aiPercent}%)</span>
              </button>
            )}
            {isGoogleTranslatingAll && (
              <button
                type="button"
                onClick={onStopGoogleTranslate}
                className="min-h-[36px] px-3 rounded-lg bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile"
              >
                <Square size={12} className="shrink-0" />
                <span className="tabular-nums">Stop Neutral ({googlePercent}%)</span>
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
