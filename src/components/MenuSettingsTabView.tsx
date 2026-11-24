import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  Palette,
  Sliders,
  Upload,
  Download,
  Trash2,
  RotateCcw,
  Clapperboard,
  Edit3,
  Check,
  Loader2,
  Cpu,
  Languages,
  Save,
  ChevronDown,
  ChevronRight,
  Bell,
  Code2,
  Sparkles,
  Film,
  Globe,
  HardDrive,
  Image as ImageIcon,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  X,
  Shield,
  Volume2,
  BookOpen,
  Split,
  Hash,
  MessageSquare,
  Lock,
  Layout,
  Clock,
  Activity,
  Smartphone,
  ExternalLink,
  Wifi,
  FolderOpen,
} from 'lucide-react';
import {
  AndroidPermissionSnapshot,
  AndroidSaveMode,
  clearAndroidExportFolder,
  getAndroidPermissionSnapshot,
  pickAndroidExportFolder,
  requestAndroidStoragePermission,
  openAndroidAppSettings,
} from '../services/androidNative';
import { registerBackHandler } from '../utils/backNavigation';
import {
  AppPreferences,
  ContainerSize,
  DeveloperIconId,
  DEFAULT_DEVELOPER_SETTINGS,
  GoogleRoutingMode,
  MobileSubtitleView,
  MobileTab,
  clampZoom,
  clampContainerPadding,
  containerSizeToPadding,
  paddingToContainerSize,
} from '../services/appPreferences';
import { DetailedStorageBreakdown } from '../services/db';
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
  ScriptMode,
  ToneRegister,
  HonorificRegister,
  LoanWordMode,
  IdiomMode,
  LineBreakMode,
  ContentFilter,
  AudioCueMode,
  NumberFormatMode,
  PunctuationMode,
} from '../services/translationSettings';
import { CustomFontItem } from '../constants/fonts';
import { APP_THEMES, AppTheme } from './ThemeSelector';
import { InfoPopover } from './InfoPopover';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { cn } from '../utils/cn';

export type SettingsCategoryId =
  | 'display'
  | 'theme'
  | 'translation'
  | 'alerts'
  | 'storage'
  | 'developer';

export type TranslationSubMenuId = 'language' | 'ai' | 'google';

const SOURCE_LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect' },
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fa', name: 'Persian (فارسی)' },
];

const GEMINI_MODELS = [
  { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen / Flash' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-4-neon', label: 'Gemini 4 Neon / Pro' },
  { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
];

const GOOGLE_ROUTING_MODES: { id: GoogleRoutingMode; label: string }[] = [
  { id: 'hybrid', label: 'Hybrid (Cloud API + Web Fallback)' },
  { id: 'web', label: 'Web Endpoint Only (Free)' },
  { id: 'cloud', label: 'Google Cloud API Only' },
];

interface MenuSettingsTabViewProps {
  preferences: AppPreferences;
  onUpdatePreferences: (updater: (prev: AppPreferences) => AppPreferences) => void;
  onResetPreferences: () => void;
  onOpenOnScreenSliders: () => void;
  focusedCategory?: SettingsCategoryId | null;
  focusedTranslationSub?: TranslationSubMenuId | null;
  translationSettings: TranslationSettings;
  onUpdateTranslationSettings: (next: TranslationSettings) => void;
  selectedModel: string;
  onUpdateModel: (model: string) => void;
  geminiApiKey: string;
  onUpdateGeminiApiKey: (key: string) => void;
  onApplyGeminiApiKey: (key?: string) => void;
  googleApiKey: string;
  onUpdateGoogleApiKey: (key: string) => void;
  isGeminiConnected: boolean;
  geminiConnectStatus: 'idle' | 'loading' | 'success' | 'failed';
  googleConnectStatus: 'idle' | 'loading' | 'success' | 'failed';
  onConnectGemini: () => void;
  onUpdateGoogleConfig: () => void;
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
  onToggleAdaptiveScaling: (val: boolean) => void;
  storageBreakdown: DetailedStorageBreakdown;
  onRefreshStorageStats: () => void;
  onDeleteDraftFromStorage: (id: string) => Promise<void>;
  onClearCrashSnapshotFromStorage: () => Promise<void>;
  localFonts: CustomFontItem[];
  onDeleteLocalFont: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onSaveCurrentDraftQuick: () => void;
  onClearAllDrafts: () => void;
  onDiscardActiveProject: () => void;
  onOpenCinemaStudio: () => void;
  onOpenEditStudio: () => void;
  hasActiveSubtitles: boolean;
  sessionId: string;
}

export const MenuSettingsTabView: React.FC<MenuSettingsTabViewProps> = ({
  preferences,
  onUpdatePreferences,
  onResetPreferences,
  onOpenOnScreenSliders,
  focusedCategory,
  focusedTranslationSub,
  translationSettings,
  onUpdateTranslationSettings,
  selectedModel,
  onUpdateModel,
  geminiApiKey,
  onUpdateGeminiApiKey,
  onApplyGeminiApiKey,
  googleApiKey,
  onUpdateGoogleApiKey,
  isGeminiConnected,
  geminiConnectStatus,
  googleConnectStatus,
  onConnectGemini,
  onUpdateGoogleConfig,
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
  storageBreakdown,
  onRefreshStorageStats,
  onDeleteDraftFromStorage,
  onClearCrashSnapshotFromStorage,
  localFonts,
  onDeleteLocalFont,
  onExportBackup,
  onImportBackup,
  onSaveCurrentDraftQuick,
  onClearAllDrafts,
  onDiscardActiveProject,
  onOpenCinemaStudio,
  onOpenEditStudio,
  hasActiveSubtitles,
  sessionId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [androidPerms, setAndroidPerms] = useState<AndroidPermissionSnapshot | null>(null);
  const [androidPermMessage, setAndroidPermMessage] = useState<string>('');
  const [isCheckingPerms, setIsCheckingPerms] = useState(false);

  const backupInputRef = useRef<HTMLInputElement>(null);
  const iconUploadRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const refreshAndroidPermissions = async () => {
    setIsCheckingPerms(true);
    try {
      const snap = await getAndroidPermissionSnapshot();
      setAndroidPerms(snap);
    } finally {
      setIsCheckingPerms(false);
    }
  };

  useEffect(() => {
    void refreshAndroidPermissions();
    const onNativeChange = () => {
      void refreshAndroidPermissions();
    };
    window.addEventListener('urduLocalizerPermissionsChanged', onNativeChange);
    window.addEventListener('urduLocalizerFolderPicked', onNativeChange);
    return () => {
      window.removeEventListener('urduLocalizerPermissionsChanged', onNativeChange);
      window.removeEventListener('urduLocalizerFolderPicked', onNativeChange);
    };
  }, []);

  useEffect(() => {
    return registerBackHandler(() => {
      if (pendingConfirm) {
        setPendingConfirm(null);
        return true;
      }
      const hasOpenRow = Object.values(openRows).some(Boolean);
      if (hasOpenRow) {
        setOpenRows({});
        return true;
      }
      if (searchQuery.trim().length > 0) {
        setSearchQuery('');
        return true;
      }
      return false;
    });
  }, [pendingConfirm, openRows, searchQuery]);

  const handleRequestStoragePerm = async () => {
    setIsCheckingPerms(true);
    try {
      const res = await requestAndroidStoragePermission();
      setAndroidPermMessage(res.message);
      await refreshAndroidPermissions();
    } finally {
      setIsCheckingPerms(false);
    }
  };

  const handlePickAndroidExportFolder = async () => {
    setIsCheckingPerms(true);
    try {
      const picked = await pickAndroidExportFolder();
      if (picked) {
        setAndroidPermMessage(`Export folder granted: "${picked.name}".`);
      }
      await refreshAndroidPermissions();
    } finally {
      setIsCheckingPerms(false);
    }
  };

  useEffect(() => {
    const targetKey =
      focusedTranslationSub === 'ai'
        ? 'geminiApiKey'
        : focusedTranslationSub === 'google'
        ? 'googleApiKey'
        : focusedTranslationSub === 'language'
        ? 'targetLanguage'
        : focusedCategory === 'developer'
        ? 'appIdentity'
        : focusedCategory === 'storage'
        ? 'storageDrafts'
        : null;

    if (!targetKey) return;
    setOpenRows((prev) => ({ ...prev, [targetKey]: true }));
    const timer = setTimeout(() => {
      rowRefs.current[targetKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => clearTimeout(timer);
  }, [focusedCategory, focusedTranslationSub]);

  const toggleRow = (id: string) => {
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
    setPendingConfirm({ title, message, onConfirm });
  };

  const updateTranslation = (patch: Partial<TranslationSettings>) => {
    onUpdateTranslationSettings({ ...translationSettings, ...patch });
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleUploadCustomIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) {
        onUpdatePreferences((prev) => ({
          ...prev,
          developerSettings: {
            ...prev.developerSettings,
            iconId: 'custom',
            customIconDataUrl: dataUrl,
          },
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isLightTheme = preferences.theme === 'classic';
  const obsidianSurfaceStyle: React.CSSProperties = isLightTheme
    ? {
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text)',
      }
    : {
        backgroundColor: '#0c0e13',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        color: 'var(--theme-text)',
      };

  const obsidianInsetStyle: React.CSSProperties = isLightTheme
    ? {
        backgroundColor: 'var(--theme-elevated)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text)',
      }
    : {
        backgroundColor: '#12151d',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        color: 'var(--theme-text)',
      };

  const rowDividerClass = isLightTheme
    ? 'border-b border-slate-200/80 last:border-b-0'
    : 'border-b border-white/[0.06] last:border-b-0';

  const quotaRatio =
    storageBreakdown.quotaTotalBytes && storageBreakdown.quotaUsageBytes !== null
      ? Math.min(100, Math.round((storageBreakdown.quotaUsageBytes / storageBreakdown.quotaTotalBytes) * 100))
      : null;

  const q = searchQuery.trim().toLowerCase();
  const matchesFilter = (title: string, keywords = '') => {
    if (!q) return true;
    return title.toLowerCase().includes(q) || keywords.toLowerCase().includes(q);
  };

  const renderSelectRow = ({
    id,
    title,
    subtitle,
    icon: Icon,
    value,
    onChange,
    options,
    keywords = '',
  }: {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    keywords?: string;
  }) => {
    if (!matchesFilter(title, `${subtitle || ''} ${keywords}`)) return null;
    return (
      <div
        key={id}
        ref={(el) => {
          rowRefs.current[id] = el;
        }}
        className={cn(
          'px-3 py-2.5 flex items-center justify-between gap-2.5 transition-colors',
          rowDividerClass
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
            style={obsidianInsetStyle}
          >
            <Icon size={13} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold truncate">{title}</p>
            {subtitle && <p className="text-[10px] opacity-55 truncate">{subtitle}</p>}
          </div>
        </div>
        <select
          aria-label={title}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[34px] max-w-[170px] sm:max-w-[230px] px-2.5 rounded-lg border text-[11px] font-semibold shrink-0 cursor-pointer"
          style={obsidianInsetStyle}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderToggleRow = ({
    id,
    title,
    subtitle,
    icon: Icon,
    checked,
    onChange,
    actionButton,
    keywords = '',
  }: {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
    checked: boolean;
    onChange: (next: boolean) => void;
    actionButton?: React.ReactNode;
    keywords?: string;
  }) => {
    if (!matchesFilter(title, `${subtitle || ''} ${keywords}`)) return null;
    return (
      <div
        key={id}
        ref={(el) => {
          rowRefs.current[id] = el;
        }}
        className={cn(
          'px-3 py-2.5 flex items-center justify-between gap-2.5 transition-colors',
          rowDividerClass
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
            style={obsidianInsetStyle}
          >
            <Icon size={13} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold truncate">{title}</p>
            {subtitle && <p className="text-[10px] opacity-55 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actionButton}
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={title}
            onClick={() => onChange(!checked)}
            className={cn(
              'w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 cursor-pointer',
              checked ? 'justify-end' : 'bg-zinc-500/35 justify-start'
            )}
            style={checked ? { backgroundColor: 'var(--theme-accent)' } : undefined}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </div>
    );
  };

  const renderExpandableRow = ({
    id,
    title,
    valueLabel,
    icon: Icon,
    keywords = '',
    statusDot,
    children,
  }: {
    id: string;
    title: string;
    valueLabel: string;
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
    keywords?: string;
    statusDot?: 'green' | 'amber' | 'neutral';
    children: React.ReactNode;
  }) => {
    if (!matchesFilter(title, `${valueLabel} ${keywords}`)) return null;
    const isOpen = Boolean(openRows[id]) || Boolean(q);
    return (
      <div
        key={id}
        ref={(el) => {
          rowRefs.current[id] = el;
        }}
        className={rowDividerClass}
      >
        <button
          type="button"
          onClick={() => toggleRow(id)}
          aria-expanded={isOpen}
          className="w-full px-3 py-2.5 flex items-center justify-between gap-2.5 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
              style={obsidianInsetStyle}
            >
              <Icon size={13} style={{ color: 'var(--theme-accent)' }} />
            </div>
            <span className="text-[11.5px] font-semibold truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 max-w-[50%]">
            <span
              className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium truncate inline-flex items-center gap-1.5"
              style={obsidianInsetStyle}
            >
              {statusDot && (
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    statusDot === 'green'
                      ? 'bg-emerald-500'
                      : statusDot === 'amber'
                      ? 'bg-amber-400'
                      : 'bg-zinc-400'
                  )}
                />
              )}
              <span className="truncate">{valueLabel}</span>
            </span>
            {isOpen ? (
              <ChevronDown size={14} className="opacity-65 shrink-0" />
            ) : (
              <ChevronRight size={14} className="opacity-45 shrink-0" />
            )}
          </div>
        </button>

        {isOpen && (
          <div
            className="mx-3 mb-3 p-3 rounded-xl border space-y-2.5"
            style={obsidianInsetStyle}
          >
            {children}
          </div>
        )}
      </div>
    );
  };

  const activeThemeName = APP_THEMES.find((t) => t.id === preferences.theme)?.name || preferences.theme;
  const activeTargetLang =
    TARGET_LANGUAGES.find((l) => l.code === translationSettings.targetLanguage)?.name ||
    translationSettings.targetLanguage;
  const geminiKeySaved = Boolean(geminiApiKey.trim());
  const googleKeySaved = Boolean(googleApiKey.trim());

  const rows = [
    // 1. Theme
    renderSelectRow({
      id: 'theme',
      title: 'Theme',
      subtitle: 'Obsidian & studio color palette',
      icon: Palette,
      value: preferences.theme,
      onChange: (val) => onUpdatePreferences((prev) => ({ ...prev, theme: val as AppTheme })),
      options: APP_THEMES.map((t) => ({ value: t.id, label: `${t.name} (${t.category})` })),
      keywords: `${activeThemeName} palette dark light obsidian`,
    }),

    // 2. Subtitle View Mode
    renderSelectRow({
      id: 'subtitleView',
      title: 'Subtitle View Mode',
      subtitle: 'Default workspace display format',
      icon: Layout,
      value: preferences.mobileSubtitleView,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({ ...prev, mobileSubtitleView: val as MobileSubtitleView })),
      options: [
        { value: 'table', label: 'Table' },
        { value: 'cards', label: 'Cards' },
        { value: 'stream-switch', label: 'Stream Switch' },
        { value: 'compact', label: 'Compact' },
      ],
      keywords: 'table cards compact switch view',
    }),

    // 3. Startup Tab
    renderSelectRow({
      id: 'startupTab',
      title: 'Startup Tab',
      subtitle: 'Initial workspace screen on launch',
      icon: Sparkles,
      value: preferences.defaultStartupTab,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({ ...prev, defaultStartupTab: val as MobileTab })),
      options: [
        { value: 'home', label: 'Home' },
        { value: 'translator', label: 'Translator' },
        { value: 'workspace', label: 'Workspace' },
        { value: 'styling', label: 'Styling' },
        { value: 'download', label: 'Export' },
        { value: 'menu', label: 'Settings' },
      ],
      keywords: 'launch screen tab home export',
    }),

    // 4. Rows Per Page
    renderSelectRow({
      id: 'rowsPerPage',
      title: 'Rows Per Page',
      subtitle: 'Subtitle blocks rendered per page',
      icon: Sliders,
      value: String(preferences.defaultPageSize),
      onChange: (val) =>
        onUpdatePreferences((prev) => ({ ...prev, defaultPageSize: Number(val) })),
      options: [
        { value: '25', label: '25 Rows' },
        { value: '50', label: '50 Rows' },
        { value: '100', label: '100 Rows' },
        { value: '0', label: 'All Rows' },
      ],
      keywords: 'pagination page size',
    }),

    // 5. Source Language
    renderSelectRow({
      id: 'sourceLanguage',
      title: 'Source Language',
      subtitle: 'Original video/audio dialogue language',
      icon: Globe,
      value: translationSettings.sourceLanguage || 'auto',
      onChange: (val) => updateTranslation({ sourceLanguage: val }),
      options: SOURCE_LANGUAGES.map((l) => ({ value: l.code, label: l.name })),
      keywords: 'input audio english turkish korean arabic',
    }),

    // 6. Target Language
    renderSelectRow({
      id: 'targetLanguage',
      title: 'Target Language',
      subtitle: 'Localized subtitle output language',
      icon: Languages,
      value: translationSettings.targetLanguage,
      onChange: (val) => updateTranslation({ targetLanguage: val }),
      options: TARGET_LANGUAGES.map((l) => ({
        value: l.code,
        label: `${l.name} (${l.nativeName})`,
      })),
      keywords: `${activeTargetLang} urdu hindi punjabi sindhi pashto arabic`,
    }),

    // 7. Script & Bilingual Mode
    renderSelectRow({
      id: 'scriptMode',
      title: 'Script & Bilingual Mode',
      subtitle: 'Urdu Nastaliq, Roman Urdu, or stacked bilingual',
      icon: Split,
      value: translationSettings.scriptMode,
      onChange: (val) => updateTranslation({ scriptMode: val as ScriptMode }),
      options: SCRIPT_MODES.map((m) => ({ value: m.id, label: m.label })),
      keywords: 'roman urdu nastaliq bilingual side by side',
    }),

    // 8. Translation Tone
    renderSelectRow({
      id: 'toneRegister',
      title: 'Translation Tone',
      subtitle: 'Conversational, Adabi, Filmi, Comedy, etc.',
      icon: BookOpen,
      value: translationSettings.toneRegister,
      onChange: (val) => updateTranslation({ toneRegister: val as ToneRegister }),
      options: TONE_REGISTERS.map((t) => ({ value: t.id, label: t.label })),
      keywords: 'aam bolchal adabi filmi youth humorous',
    }),

    // 9. Honorifics
    renderSelectRow({
      id: 'honorificRegister',
      title: 'Honorifics (Aap / Tum / Tu)',
      subtitle: 'Pronoun respect & formality register',
      icon: MessageSquare,
      value: translationSettings.honorificRegister,
      onChange: (val) => updateTranslation({ honorificRegister: val as HonorificRegister }),
      options: HONORIFIC_OPTIONS.map((h) => ({ value: h.id, label: h.label })),
      keywords: 'aap tum tu pronoun respect',
    }),

    // 10. Loan Words
    renderSelectRow({
      id: 'loanWordMode',
      title: 'Loan Words & Code-Switching',
      subtitle: 'Natural Urdish vs pure native vocabulary',
      icon: Globe,
      value: translationSettings.loanWordMode,
      onChange: (val) => updateTranslation({ loanWordMode: val as LoanWordMode }),
      options: LOAN_WORD_OPTIONS.map((l) => ({ value: l.id, label: l.label })),
      keywords: 'hinglish urdish vernacular transliterate',
    }),

    // 11. Idioms
    renderSelectRow({
      id: 'idiomMode',
      title: 'Idiom Adaptation',
      subtitle: 'Cultural proverb equivalence vs literal',
      icon: Sparkles,
      value: translationSettings.idiomMode,
      onChange: (val) => updateTranslation({ idiomMode: val as IdiomMode }),
      options: IDIOM_OPTIONS.map((i) => ({ value: i.id, label: i.label })),
      keywords: 'muhavara literal proverb',
    }),

    // 12. Line Break Mode
    renderSelectRow({
      id: 'lineBreakMode',
      title: 'Line Break Mode',
      subtitle: 'Smart 2-line wrapping vs single-line',
      icon: Split,
      value: translationSettings.lineBreakMode,
      onChange: (val) => updateTranslation({ lineBreakMode: val as LineBreakMode }),
      options: LINE_BREAK_MODES.map((b) => ({ value: b.id, label: b.label })),
      keywords: 'wrap split cps screen balance',
    }),

    // 13. Numerals Format
    renderSelectRow({
      id: 'numberFormatMode',
      title: 'Numerals Format',
      subtitle: 'Western digits, Eastern Urdu, or words',
      icon: Hash,
      value: translationSettings.numberFormatMode,
      onChange: (val) => updateTranslation({ numberFormatMode: val as NumberFormatMode }),
      options: NUMBER_FORMAT_OPTIONS.map((n) => ({ value: n.id, label: n.label })),
      keywords: 'digits numbers arabic western spelled',
    }),

    // 14. Punctuation Style
    renderSelectRow({
      id: 'punctuationMode',
      title: 'Punctuation Style',
      subtitle: 'Urdu native marks (۔ ، ؟) vs Western',
      icon: MessageSquare,
      value: translationSettings.punctuationMode,
      onChange: (val) => updateTranslation({ punctuationMode: val as PunctuationMode }),
      options: PUNCTUATION_OPTIONS.map((p) => ({ value: p.id, label: p.label })),
      keywords: 'khatma comma question mark',
    }),

    // 15. Content Filter
    renderSelectRow({
      id: 'contentFilter',
      title: 'Content Filter',
      subtitle: 'Dialogue moderation & profanity handling',
      icon: Shield,
      value: translationSettings.contentFilter,
      onChange: (val) => updateTranslation({ contentFilter: val as ContentFilter }),
      options: CONTENT_FILTERS.map((f) => ({ value: f.id, label: f.label })),
      keywords: 'censorship family friendly asterisk',
    }),

    // 16. Audio Cues
    renderSelectRow({
      id: 'audioCueMode',
      title: 'Audio Cues [SFX]',
      subtitle: 'Handling for [music], [sighs], [applause]',
      icon: Volume2,
      value: translationSettings.audioCueMode,
      onChange: (val) => updateTranslation({ audioCueMode: val as AudioCueMode }),
      options: AUDIO_CUE_OPTIONS.map((c) => ({ value: c.id, label: c.title })),
      keywords: 'sound effects brackets strip translate',
    }),

    // 17. Gemini AI Model
    renderSelectRow({
      id: 'selectedModel',
      title: 'Gemini AI Model',
      subtitle: 'Foundation model used for context & translation',
      icon: Cpu,
      value: selectedModel,
      onChange: onUpdateModel,
      options: GEMINI_MODELS.map((m) => ({ value: m.id, label: m.label })),
      keywords: 'hydrogen neon carbon flash lite pro',
    }),

    // 18. Google Translate Routing Mode (Revived!)
    renderSelectRow({
      id: 'googleRoutingMode',
      title: 'Google Translate Routing Mode',
      subtitle: 'Choose Hybrid, Free Web endpoint, or Cloud API',
      icon: Languages,
      value: preferences.googleRoutingMode,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({ ...prev, googleRoutingMode: val as GoogleRoutingMode })),
      options: GOOGLE_ROUTING_MODES.map((m) => ({ value: m.id, label: m.label })),
      keywords: 'hybrid web cloud gtx neutral routing',
    }),

    // 19. UI Zoom
    renderExpandableRow({
      id: 'uiZoom',
      title: 'UI Zoom',
      valueLabel: `${preferences.uiZoom}%`,
      icon: ZoomIn,
      keywords: 'scale magnification floating sliders',
      children: (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium">Zoom Scale: {preferences.uiZoom}%</span>
            <button
              type="button"
              onClick={onOpenOnScreenSliders}
              className="min-h-[30px] px-2.5 rounded-lg text-white text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <ZoomIn size={11} />
              <span>Floating Sliders</span>
            </button>
          </div>
          <input
            type="range"
            min={50}
            max={200}
            step={5}
            value={preferences.uiZoom}
            onChange={(e) =>
              onUpdatePreferences((prev) => ({ ...prev, uiZoom: clampZoom(Number(e.target.value)) }))
            }
            className="w-full cursor-pointer"
          />
          <div className="grid grid-cols-6 gap-1">
            {[50, 75, 100, 125, 150, 200].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onUpdatePreferences((prev) => ({ ...prev, uiZoom: preset }))}
                className={cn(
                  'min-h-[30px] rounded-lg border text-[10.5px] font-mono font-semibold cursor-pointer',
                  preferences.uiZoom === preset ? 'text-white' : ''
                )}
                style={
                  preferences.uiZoom === preset
                    ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                    : obsidianSurfaceStyle
                }
              >
                {preset}%
              </button>
            ))}
          </div>
        </>
      ),
    }),

    // 20. Container Spacing
    renderExpandableRow({
      id: 'containerSpacing',
      title: 'Container Spacing',
      valueLabel: `${preferences.containerPaddingPx}px · ${preferences.containerSize}`,
      icon: Sliders,
      keywords: 'padding gap density compact spacious',
      children: (
        <>
          <div className="flex items-center justify-between text-[11px]">
            <span>Container Padding</span>
            <span className="font-mono font-semibold tabular-nums">
              {preferences.containerPaddingPx}px ({preferences.containerSize})
            </span>
          </div>
          <input
            type="range"
            min={6}
            max={28}
            step={1}
            value={preferences.containerPaddingPx}
            onChange={(e) => {
              const px = clampContainerPadding(Number(e.target.value));
              onUpdatePreferences((prev) => ({
                ...prev,
                containerPaddingPx: px,
                containerSize: paddingToContainerSize(px),
              }));
            }}
            className="w-full cursor-pointer"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {(['compact', 'standard', 'spacious'] as ContainerSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    containerSize: size,
                    containerPaddingPx: containerSizeToPadding(size),
                  }))
                }
                className={cn(
                  'min-h-[32px] rounded-lg border text-[11px] font-semibold capitalize cursor-pointer',
                  preferences.containerSize === size ? 'text-white' : ''
                )}
                style={
                  preferences.containerSize === size
                    ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                    : obsidianSurfaceStyle
                }
              >
                {size}
              </button>
            ))}
          </div>
        </>
      ),
    }),

    // 21. Workspace Box Height
    renderExpandableRow({
      id: 'workspaceBoxHeight',
      title: 'Workspace Box Height',
      valueLabel: `${preferences.workspaceBoxHeight}px`,
      icon: Layout,
      keywords: 'height table viewport scroll',
      children: (
        <>
          <div className="flex justify-between text-[11px]">
            <span>Desktop / Container Height</span>
            <span className="font-mono font-semibold tabular-nums">{preferences.workspaceBoxHeight}px</span>
          </div>
          <input
            type="range"
            min={400}
            max={1600}
            step={20}
            value={preferences.workspaceBoxHeight}
            onChange={(e) =>
              onUpdatePreferences((prev) => ({ ...prev, workspaceBoxHeight: Number(e.target.value) }))
            }
            className="w-full cursor-pointer"
          />
        </>
      ),
    }),

    // 22. Lock Workspace On Open
    renderToggleRow({
      id: 'defaultReadOnly',
      title: 'Lock Workspace On Open',
      subtitle: 'Start sessions in Read-Only mode to guard cells',
      icon: Lock,
      checked: preferences.defaultReadOnly,
      onChange: (val) => onUpdatePreferences((prev) => ({ ...prev, defaultReadOnly: val })),
      keywords: 'read only safety lock',
    }),

    // 23. Workspace Header Bar
    renderToggleRow({
      id: 'workspaceHeaderVisible',
      title: 'Workspace Header Bar',
      subtitle: 'Display toolbar header above subtitle table',
      icon: Layout,
      checked: preferences.workspaceHeaderVisible,
      onChange: (val) => onUpdatePreferences((prev) => ({ ...prev, workspaceHeaderVisible: val })),
      keywords: 'chrome bar title',
    }),

    // 24. Compact Header
    renderToggleRow({
      id: 'compactHeader',
      title: 'Compact Header',
      subtitle: 'Reduce top header bar height and spacing',
      icon: Layout,
      checked: preferences.headerVisibility.compactMode,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          headerVisibility: { ...prev.headerVisibility, compactMode: val },
        })),
      keywords: 'top bar slim',
    }),

    // 25. Show Filename in Header
    renderToggleRow({
      id: 'showFileName',
      title: 'Show Filename in Header',
      subtitle: 'Display active SRT/VTT/ASS filename in top bar',
      icon: Layout,
      checked: preferences.headerVisibility.showFileName,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          headerVisibility: { ...prev.headerVisibility, showFileName: val },
        })),
      keywords: 'header title file name',
    }),

    // 26. Save Status Indicator
    renderToggleRow({
      id: 'showSaveIndicator',
      title: 'Save Status Indicator',
      subtitle: 'Show live Saving / Saved pill in header',
      icon: Save,
      checked: preferences.headerVisibility.showSaveIndicator,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          headerVisibility: { ...prev.headerVisibility, showSaveIndicator: val },
        })),
      keywords: 'header auto save indicator',
    }),

    // 27. Header Zoom Chip
    renderToggleRow({
      id: 'showZoomChip',
      title: 'Header Zoom Chip',
      subtitle: 'Show quick zoom percentage chip in header',
      icon: ZoomIn,
      checked: preferences.headerVisibility.showZoomChip,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          headerVisibility: { ...prev.headerVisibility, showZoomChip: val },
        })),
      keywords: 'zoom chip header',
    }),

    // 28. Header Network Pill
    renderToggleRow({
      id: 'showNetworkPill',
      title: 'Header Network Pill',
      subtitle: 'Show online / offline & Gemini status badge',
      icon: Activity,
      checked: preferences.headerVisibility.showNetworkPill,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          headerVisibility: { ...prev.headerVisibility, showNetworkPill: val },
        })),
      keywords: 'online offline status pill',
    }),

    // 29. AI Cinema Studio
    renderToggleRow({
      id: 'showCinemaStudio',
      title: 'AI Cinema Studio',
      subtitle: 'Show Cinema Studio shortcut & open insights',
      icon: Clapperboard,
      checked: preferences.menuVisibility.showCinemaStudio,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          menuVisibility: { ...prev.menuVisibility, showCinemaStudio: val },
        })),
      actionButton: preferences.menuVisibility.showCinemaStudio ? (
        <button
          type="button"
          onClick={onOpenCinemaStudio}
          className="min-h-[28px] px-2.5 rounded-lg text-white text-[10.5px] font-semibold cursor-pointer btn-inch-cap"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          Open
        </button>
      ) : null,
      keywords: 'movie plot review cinema',
    }),

    // 30. Edit Studio
    renderToggleRow({
      id: 'showEditStudio',
      title: 'Edit Studio',
      subtitle: 'Show full-screen Edit Studio shortcut',
      icon: Edit3,
      checked: preferences.menuVisibility.showEditStudio,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          menuVisibility: { ...prev.menuVisibility, showEditStudio: val },
        })),
      actionButton: preferences.menuVisibility.showEditStudio ? (
        <button
          type="button"
          onClick={onOpenEditStudio}
          className="min-h-[28px] px-2.5 rounded-lg border text-[10.5px] font-semibold cursor-pointer btn-inch-cap"
          style={obsidianInsetStyle}
        >
          Open
        </button>
      ) : null,
      keywords: 'editor modal studio',
    }),

    // 31. Storage & Backup Visibility
    renderToggleRow({
      id: 'showBackupSection',
      title: 'Storage & Backup Controls',
      subtitle: 'Show storage breakdown, drafts manager & JSON backup',
      icon: HardDrive,
      checked: preferences.menuVisibility.showBackupSection,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          menuVisibility: { ...prev.menuVisibility, showBackupSection: val },
        })),
      keywords: 'storage backup visibility',
    }),

    // 32. Gemini API Key (Standalone / Custom Override)
    renderExpandableRow({
      id: 'geminiApiKey',
      title: 'Gemini API Key (Optional)',
      valueLabel: geminiKeySaved ? 'Local Key Saved' : 'Server Proxy',
      icon: KeyRound,
      statusDot: geminiKeySaved ? 'green' : 'neutral',
      keywords: 'gemini api key secret apk standalone direct',
      children: (
        <>
          <p className="text-[10.5px] opacity-70 leading-relaxed">
            Leave blank to use the built-in server proxy. Add your own Gemini API key for standalone APK or direct browser calls.
          </p>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => onUpdateGeminiApiKey(e.target.value)}
                placeholder="AIza... (optional standalone key)"
                className="w-full min-h-[36px] pl-2.5 pr-8 rounded-lg border text-[11px] font-mono"
                style={obsidianSurfaceStyle}
              />
              <button
                type="button"
                aria-label={showGeminiKey ? 'Hide Gemini key' : 'Show Gemini key'}
                onClick={() => setShowGeminiKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 cursor-pointer"
              >
                {showGeminiKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => onApplyGeminiApiKey(geminiApiKey)}
              className="min-h-[36px] px-3 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {geminiConnectStatus === 'loading' && <Loader2 size={12} className="animate-spin" />}
              <span>Apply & Test</span>
            </button>
            {geminiKeySaved && (
              <button
                type="button"
                onClick={() => {
                  onUpdateGeminiApiKey('');
                  onApplyGeminiApiKey('');
                }}
                className="min-h-[36px] px-2.5 rounded-lg border text-[11px] font-semibold text-red-400 border-red-500/30 cursor-pointer shrink-0"
                style={obsidianSurfaceStyle}
              >
                Clear
              </button>
            )}
          </div>
        </>
      ),
    }),

    // 33. Gemini Engine Connection
    renderExpandableRow({
      id: 'geminiConnection',
      title: 'Gemini Engine Connection',
      valueLabel: isGeminiConnected ? 'Connected' : 'Disconnected',
      icon: Cpu,
      statusDot: isGeminiConnected ? 'green' : 'amber',
      keywords: 'verify connect reconnect server status',
      children: (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold">
              {isGeminiConnected ? 'Active & Ready' : 'Not Connected'}
            </p>
            <p className="text-[10px] opacity-60 truncate">
              Model: {selectedModel} · Mode: {geminiKeySaved ? 'Direct Key' : 'Server Proxy'}
            </p>
          </div>
          <button
            type="button"
            onClick={onConnectGemini}
            className="min-h-[34px] px-3 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            {geminiConnectStatus === 'loading' && <Loader2 size={12} className="animate-spin" />}
            <span>
              {geminiConnectStatus === 'success'
                ? 'Connected'
                : geminiConnectStatus === 'failed'
                ? 'Retry'
                : isGeminiConnected
                ? 'Reconnect'
                : 'Connect'}
            </span>
          </button>
        </div>
      ),
    }),

    // 34. Gemini Workers
    renderExpandableRow({
      id: 'geminiWorkers',
      title: 'Gemini Workers',
      valueLabel: `${geminiWorkers} parallel`,
      icon: Cpu,
      keywords: 'concurrency threads parallel speed',
      children: (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span>Parallel AI Workers (1–20)</span>
            <span className="font-mono font-semibold tabular-nums">{geminiWorkers}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={20}
              value={geminiWorkers}
              onChange={(e) => onUpdateGeminiWorkers(Number(e.target.value))}
              className="flex-1 cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={20}
              value={geminiWorkers}
              onChange={(e) => onUpdateGeminiWorkers(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="w-16 min-h-[34px] px-2 rounded-lg border text-[11px] font-mono text-center"
              style={obsidianSurfaceStyle}
            />
          </div>
        </div>
      ),
    }),

    // 35. Gemini Batch Size
    renderExpandableRow({
      id: 'geminiBatchSize',
      title: 'Gemini Batch Size',
      valueLabel: `${geminiBatchSize} lines`,
      icon: Sliders,
      keywords: 'batch lines per request',
      children: (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span>Subtitle Lines Per Batch (1–50)</span>
            <span className="font-mono font-semibold tabular-nums">{geminiBatchSize}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={50}
              value={geminiBatchSize}
              onChange={(e) => onUpdateGeminiBatchSize(Number(e.target.value))}
              className="flex-1 cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={50}
              value={geminiBatchSize}
              onChange={(e) => onUpdateGeminiBatchSize(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-16 min-h-[34px] px-2 rounded-lg border text-[11px] font-mono text-center"
              style={obsidianSurfaceStyle}
            />
          </div>
        </div>
      ),
    }),

    // 36. Gemini Request Delay
    renderExpandableRow({
      id: 'geminiDelay',
      title: 'Gemini Request Delay',
      valueLabel: `${geminiDelay} ms`,
      icon: Clock,
      keywords: 'throttle cooldown rate limit ms',
      children: (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span>Cooldown Between Batches (0–10000 ms)</span>
            <span className="font-mono font-semibold tabular-nums">{geminiDelay} ms</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={10000}
              step={100}
              value={geminiDelay}
              onChange={(e) => onUpdateGeminiDelay(Number(e.target.value))}
              className="flex-1 cursor-pointer"
            />
            <input
              type="number"
              min={0}
              max={10000}
              step={100}
              value={geminiDelay}
              onChange={(e) => onUpdateGeminiDelay(Math.max(0, Math.min(10000, Number(e.target.value) || 0)))}
              className="w-20 min-h-[34px] px-2 rounded-lg border text-[11px] font-mono text-center"
              style={obsidianSurfaceStyle}
            />
          </div>
        </div>
      ),
    }),

    // 37. Adaptive Worker Scaling
    renderToggleRow({
      id: 'adaptiveScaling',
      title: 'Adaptive Worker Scaling',
      subtitle: 'Auto-adjust concurrency on 429 rate limits',
      icon: Activity,
      checked: adaptiveScalingEnabled,
      onChange: onToggleAdaptiveScaling,
      keywords: 'throttle auto scaling rate limit',
    }),

    // 38. Google Cloud API Key
    renderExpandableRow({
      id: 'googleApiKey',
      title: 'Google Cloud API Key (Optional)',
      valueLabel: googleKeySaved ? 'Key Saved' : 'Free Web Default',
      icon: KeyRound,
      statusDot: googleKeySaved ? 'green' : 'neutral',
      keywords: 'google translate cloud api key verify',
      children: (
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <input
              type={showGoogleKey ? 'text' : 'password'}
              value={googleApiKey}
              onChange={(e) => onUpdateGoogleApiKey(e.target.value)}
              placeholder="Optional Google Cloud Translate key..."
              className="w-full min-h-[36px] pl-2.5 pr-8 rounded-lg border text-[11px] font-mono"
              style={obsidianSurfaceStyle}
            />
            <button
              type="button"
              aria-label={showGoogleKey ? 'Hide Google key' : 'Show Google key'}
              onClick={() => setShowGoogleKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 cursor-pointer"
            >
              {showGoogleKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <button
            type="button"
            onClick={onUpdateGoogleConfig}
            className="min-h-[36px] px-3 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            {googleConnectStatus === 'loading' && <Loader2 size={12} className="animate-spin" />}
            <Languages size={12} />
            <span>{googleConnectStatus === 'success' ? 'Verified' : 'Apply & Test'}</span>
          </button>
        </div>
      ),
    }),

    // 39. Google Workers
    renderExpandableRow({
      id: 'googleWorkers',
      title: 'Google Workers',
      valueLabel: `${googleWorkers} parallel`,
      icon: Languages,
      keywords: 'neutral workers concurrency',
      children: (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={100}
            value={googleWorkers}
            onChange={(e) => onUpdateGoogleWorkers(Number(e.target.value))}
            className="flex-1 cursor-pointer"
          />
          <input
            type="number"
            min={1}
            max={100}
            value={googleWorkers}
            onChange={(e) => onUpdateGoogleWorkers(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="w-16 min-h-[34px] px-2 rounded-lg border text-[11px] font-mono text-center"
            style={obsidianSurfaceStyle}
          />
        </div>
      ),
    }),

    // 40. Google Batch Size
    renderExpandableRow({
      id: 'googleBatchSize',
      title: 'Google Batch Size',
      valueLabel: `${googleBatchSize} lines`,
      icon: Sliders,
      keywords: 'neutral batch size',
      children: (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={100}
            value={googleBatchSize}
            onChange={(e) => onUpdateGoogleBatchSize(Number(e.target.value))}
            className="flex-1 cursor-pointer"
          />
          <input
            type="number"
            min={1}
            max={100}
            value={googleBatchSize}
            onChange={(e) => onUpdateGoogleBatchSize(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="w-16 min-h-[34px] px-2 rounded-lg border text-[11px] font-mono text-center"
            style={obsidianSurfaceStyle}
          />
        </div>
      ),
    }),

    // 41. Auto-Hide Toasts
    renderToggleRow({
      id: 'toastsEnabled',
      title: 'Auto-Hide Toasts',
      subtitle: 'Show transient popup notifications across tabs',
      icon: Bell,
      checked: preferences.notificationPrefs.enabled,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          notificationPrefs: { ...prev.notificationPrefs, enabled: val },
        })),
      keywords: 'notifications alerts popups',
    }),

    // 42. Toast Duration
    renderExpandableRow({
      id: 'toastDuration',
      title: 'Toast Duration',
      valueLabel: `${(preferences.notificationPrefs.durationMs / 1000).toFixed(1)}s`,
      icon: Clock,
      keywords: 'notification timeout seconds',
      children: (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span>Display Timeout</span>
            <span className="font-mono font-semibold tabular-nums">
              {(preferences.notificationPrefs.durationMs / 1000).toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min={1500}
            max={6000}
            step={500}
            value={preferences.notificationPrefs.durationMs}
            onChange={(e) =>
              onUpdatePreferences((prev) => ({
                ...prev,
                notificationPrefs: { ...prev.notificationPrefs, durationMs: Number(e.target.value) },
              }))
            }
            className="w-full cursor-pointer"
          />
        </div>
      ),
    }),

    // 43. Warning Alerts
    renderToggleRow({
      id: 'showWarnings',
      title: 'Warning Alerts',
      subtitle: 'Notify when rate limits or warnings occur',
      icon: Bell,
      checked: preferences.notificationPrefs.showWarnings,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          notificationPrefs: { ...prev.notificationPrefs, showWarnings: val },
        })),
      keywords: 'warnings toast',
    }),

    // 44. Save Alerts
    renderToggleRow({
      id: 'showSaveAlerts',
      title: 'Save Alerts',
      subtitle: 'Show toast confirmations when saving drafts',
      icon: Save,
      checked: preferences.notificationPrefs.showSaveAlerts,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          notificationPrefs: { ...prev.notificationPrefs, showSaveAlerts: val },
        })),
      keywords: 'save notification',
    }),

    // 45. Help Icons (?)
    renderToggleRow({
      id: 'showInfoGuides',
      title: 'Help Icons (?)',
      subtitle: 'Display contextual info popovers across controls',
      icon: BookOpen,
      checked: preferences.optionalFeatures.showInfoGuides,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          optionalFeatures: { ...prev.optionalFeatures, showInfoGuides: val },
        })),
      keywords: 'info popover guides help',
    }),

    // 46. QC Inspector
    renderToggleRow({
      id: 'enableQcInspector',
      title: 'QC Inspector',
      subtitle: 'Highlight high-CPS, empty, and overlapping lines',
      icon: Shield,
      checked: preferences.optionalFeatures.enableQcInspector,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          optionalFeatures: { ...prev.optionalFeatures, enableQcInspector: val },
        })),
      keywords: 'quality check cps overlap',
    }),

    // 47. Glossary Lock
    renderToggleRow({
      id: 'enableTermGlossary',
      title: 'Glossary Lock',
      subtitle: 'Enforce saved character & term translations',
      icon: BookOpen,
      checked: preferences.optionalFeatures.enableTermGlossary,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          optionalFeatures: { ...prev.optionalFeatures, enableTermGlossary: val },
        })),
      keywords: 'terms dictionary characters',
    }),

    // 48. Crash Auto-Save
    renderToggleRow({
      id: 'autoSaveDrafts',
      title: 'Crash Auto-Save',
      subtitle: 'Save live recovery snapshots on background/exit',
      icon: Save,
      checked: preferences.optionalFeatures.autoSaveDrafts,
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          optionalFeatures: { ...prev.optionalFeatures, autoSaveDrafts: val },
        })),
      keywords: 'recovery snapshot autosave',
    }),

    // 49. App Name & Badge
    renderExpandableRow({
      id: 'appIdentity',
      title: 'App Name & Badge',
      valueLabel: `${preferences.developerSettings.appName} · ${preferences.developerSettings.appBadge}`,
      icon: Code2,
      keywords: 'developer branding title version badge',
      children: (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <label className="text-[10.5px] font-semibold block">App Name</label>
            <input
              type="text"
              value={preferences.developerSettings.appName}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({
                  ...prev,
                  developerSettings: { ...prev.developerSettings, appName: e.target.value },
                }))
              }
              placeholder="Urdu Localizer"
              className="w-full min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold"
              style={obsidianSurfaceStyle}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10.5px] font-semibold block">Badge</label>
            <input
              type="text"
              value={preferences.developerSettings.appBadge}
              onChange={(e) =>
                onUpdatePreferences((prev) => ({
                  ...prev,
                  developerSettings: { ...prev.developerSettings, appBadge: e.target.value },
                }))
              }
              placeholder="v3"
              className="w-full min-h-[34px] px-2.5 rounded-lg border text-[11px] font-mono font-semibold"
              style={obsidianSurfaceStyle}
            />
          </div>
        </div>
      ),
    }),

    // 50. Header App Icon
    renderExpandableRow({
      id: 'headerIcon',
      title: 'Header App Icon',
      valueLabel: preferences.developerSettings.iconId,
      icon: ImageIcon,
      keywords: 'developer logo custom upload icon',
      children: (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {(
              [
                { id: 'languages', label: 'Lang', Icon: Languages },
                { id: 'sparkles', label: 'Sparkles', Icon: Sparkles },
                { id: 'clapperboard', label: 'Cinema', Icon: Clapperboard },
                { id: 'film', label: 'Film', Icon: Film },
                { id: 'globe', label: 'Globe', Icon: Globe },
              ] as { id: DeveloperIconId; label: string; Icon: React.ComponentType<{ size?: number }> }[]
            ).map(({ id, label, Icon }) => {
              const selected = preferences.developerSettings.iconId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onUpdatePreferences((prev) => ({
                      ...prev,
                      developerSettings: { ...prev.developerSettings, iconId: id },
                    }))
                  }
                  className={cn(
                    'min-h-[38px] p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold cursor-pointer',
                    selected ? 'text-white' : ''
                  )}
                  style={
                    selected
                      ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                      : obsidianSurfaceStyle
                  }
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => iconUploadRef.current?.click()}
              className={cn(
                'min-h-[38px] p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold cursor-pointer',
                preferences.developerSettings.iconId === 'custom' ? 'text-white' : ''
              )}
              style={
                preferences.developerSettings.iconId === 'custom'
                  ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                  : obsidianSurfaceStyle
              }
            >
              <ImageIcon size={13} />
              <span>Upload</span>
            </button>
          </div>
          <input
            ref={iconUploadRef}
            type="file"
            accept="image/*"
            onChange={handleUploadCustomIcon}
            className="hidden"
          />
        </>
      ),
    }),

    // 51. Custom Theme Colors
    renderExpandableRow({
      id: 'customColors',
      title: 'Custom Theme Colors (BG / Surface / Accent)',
      valueLabel:
        preferences.developerSettings.customAccentHex ||
        preferences.developerSettings.customBgCss ||
        'Theme Default',
      icon: Palette,
      keywords: 'developer color picker hex background surface accent',
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            {
              label: 'Background',
              key: 'customBgCss' as const,
              fallback: '#090a0d',
              val: preferences.developerSettings.customBgCss,
            },
            {
              label: 'Surface',
              key: 'customSurfaceCss' as const,
              fallback: '#111318',
              val: preferences.developerSettings.customSurfaceCss,
            },
            {
              label: 'Accent',
              key: 'customAccentHex' as const,
              fallback: '#14b8a6',
              val: preferences.developerSettings.customAccentHex,
            },
          ].map((item) => (
            <div key={item.key} className="space-y-1">
              <label className="text-[10px] font-semibold block">{item.label}</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(item.val) ? item.val : item.fallback}
                  onChange={(e) =>
                    onUpdatePreferences((prev) => ({
                      ...prev,
                      developerSettings: { ...prev.developerSettings, [item.key]: e.target.value },
                    }))
                  }
                  className="w-8 h-8 rounded-md border cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={item.val}
                  onChange={(e) =>
                    onUpdatePreferences((prev) => ({
                      ...prev,
                      developerSettings: { ...prev.developerSettings, [item.key]: e.target.value },
                    }))
                  }
                  placeholder="Default"
                  className="flex-1 min-w-0 min-h-[34px] px-2 rounded-lg border text-[10px] font-mono"
                  style={obsidianSurfaceStyle}
                />
              </div>
            </div>
          ))}
        </div>
      ),
    }),

    // 52. Android Subtitle Export Mode
    renderSelectRow({
      id: 'androidSaveMode',
      title: 'Android Subtitle Export Mode',
      subtitle: 'How exported subtitles save inside Android APK',
      icon: Smartphone,
      value: preferences.androidSaveMode || 'documents',
      onChange: (val) =>
        onUpdatePreferences((prev) => ({
          ...prev,
          androidSaveMode: val as AndroidSaveMode,
        })),
      options: [
        { value: 'documents', label: 'Documents/UrduLocalizer' },
        { value: 'documents-and-share', label: 'Documents + Share Sheet' },
        { value: 'share', label: 'Share / Save-As Only' },
      ],
      keywords: 'android export save folder documents share sheet apk',
    }),

    // 53. Android Storage & File Permissions
    renderExpandableRow({
      id: 'androidPermissions',
      title: 'Android Permissions & File Access',
      valueLabel: androidPerms
        ? androidPerms.publicStorage === 'granted'
          ? 'Storage Granted'
          : androidPerms.publicStorage === 'scoped'
          ? 'Scoped Ready'
          : androidPerms.publicStorage === 'web'
          ? 'Web Storage'
          : androidPerms.publicStorage === 'denied'
          ? 'Denied'
          : 'Tap to Grant'
        : 'Checking...',
      icon: Shield,
      statusDot:
        androidPerms?.publicStorage === 'granted' ||
        androidPerms?.publicStorage === 'scoped' ||
        androidPerms?.publicStorage === 'web'
          ? 'green'
          : 'amber',
      keywords: 'android permissions storage read write external files srt save load manifest',
      children: (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            <div className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2" style={obsidianSurfaceStyle}>
              <span className="opacity-70">Subtitle Load / Save</span>
              <span className="font-mono font-semibold">
                {androidPerms?.publicStorage === 'granted'
                  ? 'Granted'
                  : androidPerms?.publicStorage === 'scoped'
                  ? 'Scoped Storage'
                  : androidPerms?.publicStorage === 'web'
                  ? 'Browser SAF'
                  : androidPerms?.publicStorage === 'denied'
                  ? 'Denied'
                  : 'Prompt'}
              </span>
            </div>
            <div className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2" style={obsidianSurfaceStyle}>
              <span className="opacity-70 flex items-center gap-1">
                <Wifi size={11} />
                <span>Network State</span>
              </span>
              <span className="font-mono font-semibold">
                {androidPerms?.networkConnected ? `Online (${androidPerms.networkType})` : 'Offline'}
              </span>
            </div>
          </div>

            {androidPerms?.isNativeAndroid && (
              <div
                className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 text-[11px]"
                style={obsidianSurfaceStyle}
              >
                <span className="opacity-70 truncate">Export Folder</span>
                <span className="font-mono font-semibold truncate max-w-[180px]">
                  {androidPerms.exportFolder?.name || 'Documents/UrduLocalizer (Default)'}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => { void handleRequestStoragePerm(); }}
              disabled={isCheckingPerms}
              className="min-h-[34px] px-3 rounded-lg text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {isCheckingPerms ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
              <span>{androidPerms?.isNativeAndroid ? 'Grant Storage Access' : 'Verify File Access'}</span>
            </button>

            {androidPerms?.isNativeAndroid && (
              <button
                type="button"
                onClick={() => { void handlePickAndroidExportFolder(); }}
                disabled={isCheckingPerms}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                style={obsidianSurfaceStyle}
              >
                <FolderOpen size={11} style={{ color: 'var(--theme-accent)' }} />
                <span>{androidPerms.exportFolder ? 'Change Folder' : 'Select Export Folder'}</span>
              </button>
            )}

            {androidPerms?.isNativeAndroid && androidPerms.exportFolder && (
              <button
                type="button"
                onClick={() => {
                  clearAndroidExportFolder();
                  void refreshAndroidPermissions();
                }}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                style={obsidianSurfaceStyle}
              >
                <X size={11} />
                <span>Reset Folder</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { void refreshAndroidPermissions(); }}
              disabled={isCheckingPerms}
              className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
              style={obsidianSurfaceStyle}
            >
              <RotateCcw size={11} />
              <span>Recheck</span>
            </button>

            {androidPerms?.canOpenAppSettings && (
              <button
                type="button"
                onClick={() => openAndroidAppSettings()}
                className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                style={obsidianSurfaceStyle}
              >
                <ExternalLink size={11} style={{ color: 'var(--theme-accent)' }} />
                <span>Android Settings</span>
              </button>
            )}
          </div>

          {androidPermMessage && (
            <p className="text-[10.5px] opacity-80 leading-snug">{androidPermMessage}</p>
          )}
          <p className="text-[10px] opacity-55 leading-snug">
            Manifest permissions: INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, READ/WRITE_EXTERNAL_STORAGE (Android &le;12), SAF Persistent Folder Access (Android 11–16), &amp; FileProvider Share.
          </p>
        </>
      ),
    }),

    // 54. Android Build & Intent Support
    renderExpandableRow({
      id: 'androidBuildInfo',
      title: 'Android App & Intent Support',
      valueLabel: androidPerms?.isNativeAndroid
        ? `APK v${androidPerms.appVersion}${androidPerms.sdkInt ? ` · API ${androidPerms.sdkInt}` : ''}`
        : 'Web / PWA Ready',
      icon: Smartphone,
      keywords: 'android package manifest intent open with srt vtt ass back button',
      children: (
        <div className="space-y-1.5 text-[10.5px]">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="px-2.5 py-1.5 rounded-lg border" style={obsidianSurfaceStyle}>
              <span className="opacity-60 block text-[9.5px]">Package ID</span>
              <span className="font-mono font-semibold">com.urdudubber.app</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg border" style={obsidianSurfaceStyle}>
              <span className="opacity-60 block text-[9.5px]">Runtime Platform</span>
              <span className="font-mono font-semibold">
                {androidPerms?.isNativeAndroid
                  ? `Android Native${androidPerms.sdkInt ? ` (API ${androidPerms.sdkInt})` : ''}`
                  : 'Browser / PWA'}
              </span>
            </div>
          </div>
          <p className="opacity-65 leading-snug">
            Supports Open With &amp; Share intents (.srt, .vtt, .ass, .ssa, .sbv, .lrc), hardware Back navigation, adjustResize editor keyboard, and HTTPS-enforced network security.
          </p>
        </div>
      ),
    }),

    // 55. Storage Usage & Saved Drafts (when Backup & Storage enabled)
    ...(preferences.menuVisibility.showBackupSection
      ? [
          renderExpandableRow({
            id: 'storageDrafts',
            title: 'Storage Usage & Saved Drafts',
            valueLabel: `${formatBytes(storageBreakdown.estimatedBytes)} · ${storageBreakdown.draftsCount} Drafts`,
            icon: HardDrive,
            keywords: 'indexeddb quota snapshot drafts fonts',
            children: (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tabular-nums">
                    Used: {formatBytes(storageBreakdown.estimatedBytes)}
                  </span>
                  <button
                    type="button"
                    onClick={onRefreshStorageStats}
                    className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    style={obsidianSurfaceStyle}
                  >
                    <RotateCcw size={11} />
                    <span>Refresh</span>
                  </button>
                </div>
                {quotaRatio !== null &&
                  storageBreakdown.quotaTotalBytes &&
                  storageBreakdown.quotaUsageBytes !== null && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/10">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(2, quotaRatio)}%`,
                            backgroundColor: 'var(--theme-accent)',
                          }}
                        />
                      </div>
                      <p className="text-[10px] opacity-60 font-mono tabular-nums">
                        {formatBytes(storageBreakdown.quotaUsageBytes)} /{' '}
                        {formatBytes(storageBreakdown.quotaTotalBytes)} ({quotaRatio}%)
                      </p>
                    </div>
                  )}

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
                    { label: 'Active', value: formatBytes(storageBreakdown.activeProjectBytes) },
                    { label: 'Snapshot', value: formatBytes(storageBreakdown.crashSnapshotBytes) },
                    { label: 'Prefs', value: formatBytes(storageBreakdown.localStorageBytes) },
                  ].map((stat) => (
                    <div key={stat.label} className="p-2 rounded-lg border" style={obsidianSurfaceStyle}>
                      <p className="text-[9px] opacity-55 font-semibold uppercase">{stat.label}</p>
                      <p className="text-[11px] font-mono font-semibold tabular-nums mt-0.5">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold opacity-75">
                    Saved Drafts ({storageBreakdown.draftItems.length})
                  </p>
                  {storageBreakdown.draftItems.length === 0 ? (
                    <p className="text-[10px] opacity-50">No saved drafts.</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {storageBreakdown.draftItems.map((d) => (
                        <div
                          key={d.id}
                          className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-[11px]"
                          style={obsidianSurfaceStyle}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{d.title}</p>
                            <p className="text-[10px] font-mono opacity-55 tabular-nums">
                              {d.subtitleCount}L · {formatBytes(d.bytes)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              requestConfirm(
                                'Delete Draft?',
                                `Permanently remove saved draft "${d.title}"?`,
                                () => {
                                  void onDeleteDraftFromStorage(d.id);
                                }
                              )
                            }
                            className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 text-red-400 border-red-500/30"
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {localFonts.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold opacity-75">
                      Uploaded Custom Fonts ({localFonts.length})
                    </p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {localFonts.map((f) => (
                        <div
                          key={f.id}
                          className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-[11px]"
                          style={obsidianSurfaceStyle}
                        >
                          <span className="font-semibold truncate">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => onDeleteLocalFont(f.id)}
                            className="px-2 py-0.5 rounded-md text-red-400 hover:bg-red-500/10 text-[10px] font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {storageBreakdown.crashSnapshotBytes > 0 && (
                  <div
                    className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 text-[11px]"
                    style={obsidianSurfaceStyle}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        Snapshot ({formatBytes(storageBreakdown.crashSnapshotBytes)})
                      </p>
                      <p className="text-[10px] opacity-55 truncate">
                        {storageBreakdown.crashSnapshotSavedAt || 'Saved'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm(
                          'Clear Crash Snapshot?',
                          'Remove the stored crash recovery snapshot?',
                          () => {
                            void onClearCrashSnapshotFromStorage();
                          }
                        )
                      }
                      className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold cursor-pointer shrink-0 text-red-400 border-red-500/30"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </>
            ),
          }),

          // 53. Backup & Reset Actions
          renderExpandableRow({
            id: 'backupActions',
            title: 'Backup & Reset Actions',
            valueLabel: 'JSON / Reset',
            icon: Download,
            keywords: 'export import backup json draft clear discard reset developer defaults',
            children: (
              <>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportBackup(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={onSaveCurrentDraftQuick}
                    disabled={!hasActiveSubtitles}
                    className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 btn-inch-cap"
                    style={obsidianSurfaceStyle}
                  >
                    <Save size={12} className="shrink-0" />
                    <span className="truncate">Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="min-h-[34px] px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                  >
                    <Download size={12} className="shrink-0" />
                    <span className="truncate">Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer btn-inch-cap"
                    style={obsidianSurfaceStyle}
                  >
                    <Upload size={12} className="shrink-0" />
                    <span className="truncate">Import</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    {
                      key: 'drafts',
                      label: 'Drafts',
                      title: 'Delete All Drafts?',
                      message: 'Permanently delete every saved project draft from storage?',
                      fn: onClearAllDrafts,
                    },
                    {
                      key: 'prefs',
                      label: 'Reset UI',
                      title: 'Reset UI Preferences?',
                      message: 'Restore layout, zoom, and theme preferences to defaults?',
                      fn: onResetPreferences,
                    },
                    {
                      key: 'dev',
                      label: 'Dev Reset',
                      title: 'Reset Developer Defaults?',
                      message: 'Restore app name, badge, header icon, and custom color overrides?',
                      fn: () =>
                        onUpdatePreferences((prev) => ({
                          ...prev,
                          developerSettings: { ...DEFAULT_DEVELOPER_SETTINGS },
                        })),
                    },
                    {
                      key: 'project',
                      label: 'Discard',
                      title: 'Discard Active Project?',
                      message: 'Clear the active subtitle workspace and start fresh?',
                      fn: onDiscardActiveProject,
                    },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      onClick={() => requestConfirm(btn.title, btn.message, btn.fn)}
                      className="min-h-[34px] px-2.5 rounded-lg border text-[10.5px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors btn-inch-cap text-red-400 border-red-500/30 hover:bg-red-500/10"
                    >
                      <Trash2 size={11} className="shrink-0" />
                      <span className="truncate">{btn.label}</span>
                    </button>
                  ))}
                </div>

                <p className="text-[10px] font-mono opacity-45 truncate">SID: {sessionId}</p>
              </>
            ),
          }),
        ]
      : []),
  ].filter(Boolean);

  return (
    <div className="space-y-2.5 max-w-4xl mx-auto w-full">
      {/* Compact Un-Grouped Obsidian Header & Quick Filter */}
      <div
        className="rounded-2xl border px-3 py-2.5 flex flex-wrap items-center justify-between gap-2"
        style={obsidianSurfaceStyle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sliders size={15} style={{ color: 'var(--theme-accent)' }} />
          <h1 className="text-xs font-semibold truncate">Settings</h1>
          <span
            className="px-1.5 py-0.5 rounded-md border text-[10px] font-mono opacity-75 tabular-nums"
            style={obsidianInsetStyle}
          >
            {rows.length}
          </span>
          <InfoPopover
            title="Obsidian Settings List"
            description="Every setting is arranged in a single flat un-grouped list. Use dropdowns or tap any row to adjust."
            align="left"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-1 sm:flex-initial justify-end min-w-[180px]">
          <div className="relative flex-1 sm:w-48 min-w-[120px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter settings..."
              className="w-full min-h-[32px] pl-7 pr-7 rounded-lg border text-[11px]"
              style={obsidianInsetStyle}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              requestConfirm(
                'Reset UI Preferences?',
                'Restore theme, zoom, spacing, and visibility settings to default values?',
                onResetPreferences
              )
            }
            className="min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer shrink-0 hover:opacity-85"
            style={obsidianInsetStyle}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Flat Un-Grouped Obsidian Settings Stack */}
      <div className="rounded-2xl border overflow-hidden shadow-lg" style={obsidianSurfaceStyle}>
        {rows.length > 0 ? (
          rows
        ) : (
          <div className="py-8 px-4 text-center space-y-1.5">
            <Check size={16} className="mx-auto opacity-45" />
            <p className="text-xs font-medium opacity-70">No settings match "{searchQuery}"</p>
          </div>
        )}
      </div>

      <ConfirmDialogModal
        isOpen={Boolean(pendingConfirm)}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmLabel="Yes"
        cancelLabel="No"
        danger
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          pendingConfirm?.onConfirm();
          setPendingConfirm(null);
        }}
      />
    </div>
  );
};
