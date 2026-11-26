import React, { useState, useEffect } from 'react';
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
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  BookOpen,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  TranslationSettings,
  TARGET_LANGUAGES,
  SCRIPT_MODES,
  TONE_REGISTERS,
  HONORIFIC_OPTIONS,
  LOAN_WORD_OPTIONS,
  IDIOM_OPTIONS,
  LINE_BREAK_MODES,
  CONTENT_FILTERS,
  AUDIO_CUE_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  PUNCTUATION_OPTIONS,
} from '../services/translationSettings';
import {
  AI_MODEL_CATALOG,
  CUSTOM_MODEL_TUTORIAL,
  CustomAiModelConfig,
  GOOGLE_ROUTING_MODES,
  SOURCE_LANGUAGES,
  resolveAiModel,
  validateCustomEndpointUrl,
  validateOptionalDocsUrl,
} from '../services/aiProviders';
import type { GoogleRoutingMode } from '../services/appPreferences';
import { InfoPopover } from './InfoPopover';
import { RightEdgeDrawerShell } from './RightEdgeDrawerShell';
import { cn } from '../utils/cn';

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
  activeModelApiKey: string;
  onChangeActiveModelApiKey: (key: string) => void;
  onApplyAndConnectModel: (overrideModel?: string, overrideKey?: string) => Promise<boolean | void>;
  isAiConnected: boolean;
  aiConnectStatus: 'idle' | 'loading' | 'success' | 'failed';
  aiConnectionNote?: string;
  customModels: CustomAiModelConfig[];
  onAddCustomModel: (model: CustomAiModelConfig) => void;
  onDeleteCustomModel: (id: string) => void;
  googleRoutingMode: GoogleRoutingMode;
  onUpdateGoogleRoutingMode: (mode: GoogleRoutingMode) => void;
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

const PROVIDER_GROUPS: Array<{ provider: string; label: string }> = [
  { provider: 'gemini', label: 'Google Gemini' },
  { provider: 'openai', label: 'OpenAI' },
  { provider: 'anthropic', label: 'Anthropic Claude' },
  { provider: 'deepseek', label: 'DeepSeek' },
  { provider: 'groq', label: 'GroqCloud (Fast LPU)' },
  { provider: 'openrouter', label: 'OpenRouter' },
  { provider: 'google-cloud', label: 'Google Cloud / Neutral' },
];

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
  activeModelApiKey,
  onChangeActiveModelApiKey,
  onApplyAndConnectModel,
  isAiConnected,
  aiConnectStatus,
  aiConnectionNote,
  customModels,
  onAddCustomModel,
  onDeleteCustomModel,
  googleRoutingMode,
  onUpdateGoogleRoutingMode,
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
  const [showKey, setShowKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  // Custom model form fields
  const [customName, setCustomName] = useState('');
  const [customProtocol, setCustomProtocol] = useState<'openai-compatible' | 'gemini' | 'anthropic'>('openai-compatible');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [customDocsUrl, setCustomDocsUrl] = useState('');
  const [customFormError, setCustomFormError] = useState<string | null>(null);

  // Accordion section states
  const [openPanels, setOpenPanels] = useState<{
    aiModel: boolean;
    language: boolean;
    tone: boolean;
    formatting: boolean;
    performance: boolean;
    progress: boolean;
  }>({
    aiModel: true,
    language: true,
    tone: false,
    formatting: false,
    performance: false,
    progress: true,
  });

  useEffect(() => {
    setShowKey(false);
    setCopiedUrl(false);
  }, [selectedModel]);

  const resolvedModel = resolveAiModel(selectedModel, customModels);
  const tutorialToShow = isAddCustomOpen ? CUSTOM_MODEL_TUTORIAL : resolvedModel.tutorial;

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

  const togglePanel = (key: keyof typeof openPanels) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyUrl = async (url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // Ignore clipboard failures on restricted contexts
    }
  };

  const handleSaveCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomFormError(null);

    const nameTrimmed = customName.trim();
    const modelIdTrimmed = customModelId.trim();
    if (!nameTrimmed) {
      setCustomFormError('Please enter a short display name.');
      return;
    }
    const urlCheck = validateCustomEndpointUrl(customBaseUrl);
    if (!urlCheck.valid || !urlCheck.normalized) {
      setCustomFormError(urlCheck.error || 'Invalid endpoint URL.');
      return;
    }
    if (!modelIdTrimmed) {
      setCustomFormError('Please enter the exact Model ID expected by the endpoint.');
      return;
    }
    const docsCheck = validateOptionalDocsUrl(customDocsUrl);
    if (!docsCheck.valid) {
      setCustomFormError(docsCheck.error || 'Invalid portal URL.');
      return;
    }

    const newConfig: CustomAiModelConfig = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: nameTrimmed,
      protocol: customProtocol,
      baseUrl: urlCheck.normalized,
      modelId: modelIdTrimmed,
      apiKeyUrl: docsCheck.normalized || undefined,
      createdAt: Date.now(),
    };

    onAddCustomModel(newConfig);
    onUpdateModel(newConfig.id);
    setCustomName('');
    setCustomBaseUrl('');
    setCustomModelId('');
    setCustomDocsUrl('');
    setIsAddCustomOpen(false);
  };

  const fieldStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-surface)',
    borderColor: 'var(--theme-border)',
    color: 'var(--theme-text)',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-elevated)',
    borderColor: 'var(--theme-border)',
  };

  return (
    <RightEdgeDrawerShell isOpen={isOpen} onClose={onClose} widthClass="w-[min(94vw,410px)]" roleVariant="ai">
      {/* Header */}
      <div
        className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 mc-popup-header"
        style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mc-popup-title" />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h2 className="text-xs font-semibold truncate mc-popup-title">Translation Studio & AI Keys</h2>
              <InfoPopover
                title="AI Engines, Keys & Rules"
                description="Swipe from right to configure any AI model (Gemini, OpenAI, Claude, DeepSeek, Groq, OpenRouter, or Custom APIs), manage model-specific API keys, and tune all translation settings."
                align="right"
              />
            </div>
            <p className="text-[10px] opacity-65 font-mono tabular-nums truncate">
              {resolvedModel.name} · {isAiConnected ? 'Ready' : 'Key/Check Needed'} · {aiPercent}% AI
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-lg border flex items-center justify-center opacity-75 hover:opacity-100 cursor-pointer shrink-0"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          aria-label="Close drawer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* 1. AI Model, Custom API, Auto-Synced API Key & How-To Tutorial */}
        <section className="rounded-xl border overflow-hidden" style={cardStyle}>
          <button
            type="button"
            onClick={() => togglePanel('aiModel')}
            className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11.5px] font-semibold flex items-center gap-1.5 min-w-0">
              <Cpu size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="truncate">AI Model & API Key</span>
            </span>
            <span className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isAiConnected ? 'bg-emerald-500' : 'bg-amber-400'
                )}
              />
              <span className="opacity-75 truncate max-w-[115px]">{resolvedModel.providerLabel}</span>
              {openPanels.aiModel ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          {openPanels.aiModel && (
            <div className="px-3 pb-3 pt-2 border-t space-y-2.5" style={{ borderColor: 'var(--theme-border)' }}>
              {/* Model Selector + Add Custom Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10.5px] font-semibold opacity-80">AI Mode / Model</label>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomOpen((v) => !v)}
                    className="min-h-[28px] px-2 rounded-lg border text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                    style={{
                      backgroundColor: isAddCustomOpen ? 'var(--theme-accent-soft)' : 'var(--theme-surface)',
                      borderColor: isAddCustomOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
                      color: isAddCustomOpen ? 'var(--theme-accent-text)' : 'var(--theme-text)',
                    }}
                  >
                    <Plus size={12} />
                    <span>{isAddCustomOpen ? 'Close Custom' : 'Add Custom API'}</span>
                  </button>
                </div>

                <select
                  value={selectedModel}
                  onChange={(e) => onUpdateModel(e.target.value)}
                  className="w-full min-h-[42px] px-2.5 rounded-lg border text-xs font-medium"
                  style={fieldStyle}
                >
                  {PROVIDER_GROUPS.map((grp) => {
                    const models = AI_MODEL_CATALOG.filter((m) => m.provider === grp.provider);
                    return (
                      <optgroup key={grp.provider} label={grp.label}>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {customModels.length > 0 && (
                    <optgroup label="Custom Model APIs">
                      {customModels.map((cm) => (
                        <option key={cm.id} value={cm.id}>
                          {cm.name} ({cm.modelId})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <div className="flex items-center justify-between gap-2 text-[10px] opacity-70">
                  <span className="truncate">{resolvedModel.summary}</span>
                  {resolvedModel.isCustom && resolvedModel.customConfig && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomModel(resolvedModel.customConfig!.id)}
                      className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-0.5 cursor-pointer shrink-0"
                    >
                      <Trash2 size={11} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Custom Model Inline Form */}
              {isAddCustomOpen && (
                <form
                  onSubmit={handleSaveCustomModel}
                  className="rounded-xl border p-2.5 space-y-2"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-accent)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold">Add Custom Model API</span>
                    <span className="text-[9.5px] opacity-65">Saved locally</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Preset Name (e.g. Together Llama 70B / Mistral)"
                      className="w-full min-h-[38px] px-2.5 rounded-lg border text-[11px]"
                      style={cardStyle}
                    />
                    <select
                      value={customProtocol}
                      onChange={(e) => setCustomProtocol(e.target.value as any)}
                      className="w-full min-h-[38px] px-2.5 rounded-lg border text-[11px]"
                      style={cardStyle}
                    >
                      <option value="openai-compatible">OpenAI-Compatible (/chat/completions)</option>
                      <option value="gemini">Gemini-Compatible (:generateContent)</option>
                      <option value="anthropic">Anthropic-Compatible (/v1/messages)</option>
                    </select>
                    <input
                      type="url"
                      value={customBaseUrl}
                      onChange={(e) => setCustomBaseUrl(e.target.value)}
                      placeholder="Base URL (e.g. https://api.together.xyz/v1)"
                      className="w-full min-h-[38px] px-2.5 rounded-lg border text-[11px] font-mono"
                      style={cardStyle}
                    />
                    <input
                      type="text"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      placeholder="Model ID (e.g. mistral-large-latest)"
                      className="w-full min-h-[38px] px-2.5 rounded-lg border text-[11px] font-mono"
                      style={cardStyle}
                    />
                    <input
                      type="url"
                      value={customDocsUrl}
                      onChange={(e) => setCustomDocsUrl(e.target.value)}
                      placeholder="Optional API Key Portal URL (https://...)"
                      className="w-full min-h-[38px] px-2.5 rounded-lg border text-[11px] font-mono"
                      style={cardStyle}
                    />
                  </div>

                  {customFormError && (
                    <p className="text-[10.5px] text-red-400 font-medium">{customFormError}</p>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddCustomOpen(false);
                        setCustomFormError(null);
                      }}
                      className="min-h-[34px] px-3 rounded-lg border text-[11px] font-medium cursor-pointer"
                      style={cardStyle}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="min-h-[34px] px-3.5 rounded-lg text-white text-[11px] font-semibold cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-accent)' }}
                    >
                      Save & Select
                    </button>
                  </div>
                </form>
              )}

              {/* Auto-Synced API Key Field + Portal Link */}
              <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-[10.5px] font-semibold flex items-center gap-1">
                    <KeyRound size={12} style={{ color: 'var(--theme-accent)' }} />
                    <span>{resolvedModel.providerLabel} API Key</span>
                  </label>

                  {resolvedModel.apiKeyUrl ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={resolvedModel.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10.5px] font-semibold flex items-center gap-1 hover:underline"
                        style={{ color: 'var(--theme-accent-text)' }}
                      >
                        <span>{resolvedModel.apiKeyPortalLabel}</span>
                        <ExternalLink size={11} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(resolvedModel.apiKeyUrl)}
                        className="p-1 rounded border opacity-75 hover:opacity-100 cursor-pointer"
                        style={fieldStyle}
                        title="Copy API key portal URL"
                        aria-label="Copy API key portal URL"
                      >
                        {copiedUrl ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] opacity-60 font-mono truncate max-w-[160px]">
                      {resolvedModel.endpointUrl}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={activeModelApiKey}
                      onChange={(e) => onChangeActiveModelApiKey(e.target.value)}
                      placeholder={resolvedModel.keyPlaceholder}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full min-h-[42px] pl-2.5 pr-9 rounded-lg border text-[11px] font-mono"
                      style={fieldStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-65 hover:opacity-100 cursor-pointer"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onApplyAndConnectModel(selectedModel, activeModelApiKey)}
                    disabled={aiConnectStatus === 'loading'}
                    className="min-h-[42px] px-3 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                  >
                    {aiConnectStatus === 'loading' ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : aiConnectStatus === 'success' || isAiConnected ? (
                      <ShieldCheck size={13} />
                    ) : null}
                    <span>
                      {aiConnectStatus === 'loading'
                        ? 'Checking'
                        : aiConnectStatus === 'success'
                        ? 'Verified'
                        : isAiConnected
                        ? 'Connect'
                        : 'Connect'}
                    </span>
                  </button>

                  {activeModelApiKey.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onChangeActiveModelApiKey('');
                        void onApplyAndConnectModel(selectedModel, '');
                      }}
                      className="min-h-[42px] px-2.5 rounded-lg border text-[11px] font-semibold text-red-400 cursor-pointer shrink-0"
                      style={fieldStyle}
                      title="Clear saved key for this model"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {aiConnectionNote && (
                  <p
                    className={cn(
                      'text-[10px] leading-snug',
                      aiConnectStatus === 'failed'
                        ? 'text-red-400'
                        : isAiConnected
                        ? 'text-emerald-400'
                        : 'opacity-70'
                    )}
                  >
                    {aiConnectionNote}
                  </p>
                )}

                {/* How-To Tutorial Dropdown Below API Key Field */}
                <div className="rounded-lg border overflow-hidden" style={fieldStyle}>
                  <button
                    type="button"
                    onClick={() => setIsTutorialOpen((v) => !v)}
                    className="w-full min-h-[38px] px-2.5 py-1.5 flex items-center justify-between gap-2 text-left text-[11px] font-semibold cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <BookOpen size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                      <span className="truncate">{tutorialToShow.title}</span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={cn('shrink-0 transition-transform', isTutorialOpen && 'rotate-180')}
                    />
                  </button>

                  {isTutorialOpen && (
                    <div
                      className="px-2.5 pb-2.5 pt-2 border-t space-y-1.5 text-[10.5px] leading-relaxed"
                      style={{ borderColor: 'var(--theme-border)' }}
                    >
                      <ol className="list-decimal pl-4 space-y-1 opacity-90">
                        {tutorialToShow.steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                      {tutorialToShow.note && (
                        <p className="text-[10px] opacity-70 pt-1 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                          Note: {tutorialToShow.note}
                        </p>
                      )}
                      {resolvedModel.apiKeyUrl && !isAddCustomOpen && (
                        <div className="pt-1">
                          <a
                            href={resolvedModel.apiKeyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold hover:underline"
                            style={{ color: 'var(--theme-accent-text)' }}
                          >
                            <span>Open {resolvedModel.apiKeyPortalLabel}</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. Language & Script Settings */}
        <section className="rounded-xl border overflow-hidden" style={cardStyle}>
          <button
            type="button"
            onClick={() => togglePanel('language')}
            className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11.5px] font-semibold flex items-center gap-1.5">
              <Globe size={14} style={{ color: 'var(--theme-accent)' }} />
              <span>Language & Script</span>
            </span>
            <span className="flex items-center gap-1.5 text-[10px] opacity-70">
              <span>{TARGET_LANGUAGES.find((l) => l.code === translationSettings.targetLanguage)?.name || 'Urdu'}</span>
              {openPanels.language ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          {openPanels.language && (
            <div className="px-3 pb-3 pt-2 border-t space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10.5px] opacity-75 font-medium">Source Language</label>
                  <select
                    value={translationSettings.sourceLanguage || 'auto'}
                    onChange={(e) =>
                      onUpdateTranslationSettings({ ...translationSettings, sourceLanguage: e.target.value })
                    }
                    className="w-full min-h-[40px] px-2 rounded-lg border text-xs"
                    style={fieldStyle}
                  >
                    {SOURCE_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] opacity-75 font-medium">Target Language</label>
                  <select
                    value={translationSettings.targetLanguage}
                    onChange={(e) =>
                      onUpdateTranslationSettings({ ...translationSettings, targetLanguage: e.target.value })
                    }
                    className="w-full min-h-[40px] px-2 rounded-lg border text-xs"
                    style={fieldStyle}
                  >
                    {TARGET_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.nativeName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Output Script & Bilingual Format</label>
                <select
                  value={translationSettings.scriptMode}
                  onChange={(e) =>
                    onUpdateTranslationSettings({ ...translationSettings, scriptMode: e.target.value as any })
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {SCRIPT_MODES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — {s.badge}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* 3. Tone, Honorifics & Cultural Nuances */}
        <section className="rounded-xl border overflow-hidden" style={cardStyle}>
          <button
            type="button"
            onClick={() => togglePanel('tone')}
            className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11.5px] font-semibold flex items-center gap-1.5">
              <Sparkles size={14} style={{ color: 'var(--theme-accent)' }} />
              <span>Tone, Honorifics & Vocabulary</span>
            </span>
            <span className="flex items-center gap-1.5 text-[10px] opacity-70">
              <span className="truncate max-w-[120px]">
                {TONE_REGISTERS.find((t) => t.id === translationSettings.toneRegister)?.label}
              </span>
              {openPanels.tone ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          {openPanels.tone && (
            <div className="px-3 pb-3 pt-2 border-t space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Tone & Dialogue Register</label>
                <select
                  value={translationSettings.toneRegister}
                  onChange={(e) =>
                    onUpdateTranslationSettings({ ...translationSettings, toneRegister: e.target.value as any })
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {TONE_REGISTERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Pronouns & Honorifics (آپ / تم / تو)</label>
                <select
                  value={translationSettings.honorificRegister}
                  onChange={(e) =>
                    onUpdateTranslationSettings({ ...translationSettings, honorificRegister: e.target.value as any })
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {HONORIFIC_OPTIONS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Vocabulary & Loan Words</label>
                <select
                  value={translationSettings.loanWordMode}
                  onChange={(e) =>
                    onUpdateTranslationSettings({ ...translationSettings, loanWordMode: e.target.value as any })
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {LOAN_WORD_OPTIONS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Idiom Adaptation</label>
                <select
                  value={translationSettings.idiomMode}
                  onChange={(e) =>
                    onUpdateTranslationSettings({ ...translationSettings, idiomMode: e.target.value as any })
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {IDIOM_OPTIONS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* 4. Line Formatting, Moderation & Numerals */}
        <section className="rounded-xl border overflow-hidden" style={cardStyle}>
          <button
            type="button"
            onClick={() => togglePanel('formatting')}
            className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11.5px] font-semibold flex items-center gap-1.5">
              <FileText size={14} style={{ color: 'var(--theme-accent)' }} />
              <span>Formatting, Moderation & Numerals</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] opacity-70">
              {openPanels.formatting ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          {openPanels.formatting && (
            <div className="px-3 pb-3 pt-2 border-t space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Line Break Balance</label>
                <select
                  value={translationSettings.lineBreakMode}
                  onChange={(e) =>
                    onUpdateTranslationSettings({ ...translationSettings, lineBreakMode: e.target.value as any })
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {LINE_BREAK_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Content Moderation</label>
                <select
                  value={translationSettings.contentFilter}
                  onChange={(e) =>
                    onUpdateTranslationSettings({ ...translationSettings, contentFilter: e.target.value as any })
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {CONTENT_FILTERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Sound Effects & Audio Cues [SFX]</label>
                <select
                  value={translationSettings.audioCueMode}
                  onChange={(e) =>
                    onUpdateTranslationSettings({ ...translationSettings, audioCueMode: e.target.value as any })
                  }
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {AUDIO_CUE_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10.5px] opacity-75 font-medium">Number Format</label>
                  <select
                    value={translationSettings.numberFormatMode}
                    onChange={(e) =>
                      onUpdateTranslationSettings({ ...translationSettings, numberFormatMode: e.target.value as any })
                    }
                    className="w-full min-h-[40px] px-2 rounded-lg border text-xs"
                    style={fieldStyle}
                  >
                    {NUMBER_FORMAT_OPTIONS.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] opacity-75 font-medium">Punctuation</label>
                  <select
                    value={translationSettings.punctuationMode}
                    onChange={(e) =>
                      onUpdateTranslationSettings({ ...translationSettings, punctuationMode: e.target.value as any })
                    }
                    className="w-full min-h-[40px] px-2 rounded-lg border text-xs"
                    style={fieldStyle}
                  >
                    {PUNCTUATION_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 5. Concurrency, Neutral Routing & Speed */}
        <section className="rounded-xl border overflow-hidden" style={cardStyle}>
          <button
            type="button"
            onClick={() => togglePanel('performance')}
            className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="text-[11.5px] font-semibold flex items-center gap-1.5">
              <Sliders size={14} style={{ color: 'var(--theme-accent)' }} />
              <span>Workers, Batches & Neutral Routing</span>
            </span>
            <span className="text-[10px] font-mono opacity-70 tabular-nums">
              {geminiWorkers}w · {geminiBatchSize}b · {geminiDelay}ms
            </span>
          </button>

          {openPanels.performance && (
            <div className="px-3 pb-3 pt-2 border-t space-y-2.5" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="space-y-1">
                <label className="text-[10.5px] opacity-75 font-medium">Neutral / Google Routing Mode</label>
                <select
                  value={googleRoutingMode}
                  onChange={(e) => onUpdateGoogleRoutingMode(e.target.value as GoogleRoutingMode)}
                  className="w-full min-h-[40px] px-2.5 rounded-lg border text-xs"
                  style={fieldStyle}
                >
                  {GOOGLE_ROUTING_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <label
                className="flex items-center justify-between pt-2 border-t text-[11px] font-semibold cursor-pointer"
                style={{ borderColor: 'var(--theme-border)' }}
              >
                <span>Adaptive Auto-Throttling</span>
                <input
                  type="checkbox"
                  checked={adaptiveScalingEnabled}
                  onChange={(e) => onToggleAdaptiveScaling(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: 'var(--theme-accent)' }}
                />
              </label>

              <div data-swipe-ignore="true">
                <div className="flex justify-between text-[11px] mb-1">
                  <span>AI Workers</span>
                  <span className="font-mono font-semibold tabular-nums">{geminiWorkers}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={geminiWorkers}
                  onChange={(e) => onUpdateGeminiWorkers(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: 'var(--theme-accent)' }}
                />
              </div>

              <div data-swipe-ignore="true">
                <div className="flex justify-between text-[11px] mb-1">
                  <span>AI Batch Size</span>
                  <span className="font-mono font-semibold tabular-nums">{geminiBatchSize} lines</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={geminiBatchSize}
                  onChange={(e) => onUpdateGeminiBatchSize(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: 'var(--theme-accent)' }}
                />
              </div>

              <div data-swipe-ignore="true">
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
                  className="w-full"
                  style={{ accentColor: 'var(--theme-accent)' }}
                />
              </div>

              <div
                className="pt-2 border-t grid grid-cols-2 gap-2"
                style={{ borderColor: 'var(--theme-border)' }}
                data-swipe-ignore="true"
              >
                <div>
                  <div className="flex justify-between text-[10.5px] mb-1">
                    <span>Neutral Workers</span>
                    <span className="font-mono font-semibold tabular-nums">{googleWorkers}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={googleWorkers}
                    onChange={(e) => onUpdateGoogleWorkers(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: 'var(--theme-accent)' }}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10.5px] mb-1">
                    <span>Neutral Batch</span>
                    <span className="font-mono font-semibold tabular-nums">{googleBatchSize}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={googleBatchSize}
                    onChange={(e) => onUpdateGoogleBatchSize(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: 'var(--theme-accent)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 6. Live Progress & Run Controls */}
        <section className="rounded-xl border p-2.5 space-y-2.5" style={cardStyle}>
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

          <div className="space-y-1">
            <div className="flex justify-between text-[10.5px] font-mono tabular-nums">
              <span className="truncate max-w-[140px]">{resolvedModel.name}</span>
              <span>
                {translatedCount}/{subtitlesCount} ({aiPercent}%) · {aiPending} left
              </span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
              <div
                className="h-full transition-[width] duration-200"
                style={{ width: `${aiPercent}%`, backgroundColor: 'var(--theme-accent)' }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10.5px] font-mono tabular-nums">
              <span>Google Neutral</span>
              <span>
                {googleCount}/{subtitlesCount} ({googlePercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
              <div
                className="h-full transition-[width] duration-200 bg-sky-500"
                style={{ width: `${googlePercent}%` }}
              />
            </div>
          </div>

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
                      backgroundColor: w.status === 'working' ? 'var(--theme-accent-soft)' : 'var(--theme-surface)',
                      borderColor: w.status === 'working' ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span>W{w.id}</span>
                    <span className="opacity-75">
                      {w.status === 'working' ? `#${w.currentItem ?? '...'}` : w.status === 'completed' ? 'Done' : 'Idle'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {isTranslating ? (
              <button
                type="button"
                onClick={onStopTranslation}
                className="min-h-[40px] flex-1 px-3 rounded-lg bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Square size={12} className="shrink-0" />
                <span className="truncate tabular-nums">Stop AI ({aiPercent}%)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartTranslation}
                disabled={subtitlesCount === 0}
                className="relative overflow-hidden min-h-[40px] flex-1 px-3 rounded-lg text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-45 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-300"
                  style={{ width: `${aiPercent}%` }}
                />
                <span className="relative z-10 flex items-center gap-1">
                  <Sparkles size={12} className="shrink-0" />
                  <span className="truncate tabular-nums">
                    {subtitlesCount > 0 && aiPending === 0
                      ? 'AI 100%'
                      : translatedCount > 0
                      ? `Resume AI (${aiPercent}%)`
                      : 'Start AI Dub'}
                  </span>
                </span>
              </button>
            )}

            {isGoogleTranslatingAll ? (
              <button
                type="button"
                onClick={onStopGoogleTranslate}
                className="min-h-[40px] flex-1 px-3 rounded-lg bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Loader2 size={12} className="animate-spin shrink-0" />
                <span className="truncate tabular-nums">Stop ({googlePercent}%)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartGoogleTranslate}
                disabled={subtitlesCount === 0}
                className="relative overflow-hidden min-h-[40px] flex-1 px-3 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-45 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-sky-500/20 transition-[width] duration-300"
                  style={{ width: `${googlePercent}%` }}
                />
                <span className="relative z-10 flex items-center gap-1">
                  <Languages size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                  <span className="truncate tabular-nums">
                    {googleCount > 0 ? `Neutral ${googlePercent}%` : 'Neutral'}
                  </span>
                </span>
              </button>
            )}
          </div>
        </section>

        <div className="flex justify-end pb-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullSettings();
            }}
            className="min-h-[38px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            style={cardStyle}
          >
            <Activity size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <span>Open Full Menu Settings</span>
          </button>
        </div>
      </div>
    </RightEdgeDrawerShell>
  );
};
