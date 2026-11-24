/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { 
  Upload, 
  FileText, 
  Search, 
  Languages, 
  Download, 
  Trash2, 
  Menu, 
  X, 
  ChevronRight, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
  MessageSquare,
  GripHorizontal,
  Save,
  RotateCcw,
  BarChart3,
  SearchCode,
  Type as TypeIcon,
  Activity,
  Check,
  Moon,
  Sun,
  Minimize2,
  Maximize2,
  Palette,
  Sparkles,
  Copy,
  ClipboardPaste,
  FileCode,
  ArrowLeft,
  Sliders,
  Undo,
  Redo,
  Lock,
  Unlock,
  Clock,
  Replace,
  Wand2,
  Columns,
  Filter,
  CheckSquare,
  Square,
  Eye,
  Scissors,
  Edit3,
  Plus,
  Smartphone,
  Share2,
  Youtube,
  Music,
  ShieldCheck,
  FoldHorizontal,
  Shield,
  Film,
  Clapperboard,
  Play,
  ChevronDown,
  Info,
  Cpu,
  Globe,
  FolderPlus,
  Undo2,
  Redo2,
  RefreshCw,
  Stamp,
  History,
  Home,
  ZoomIn,
  AlertTriangle,
  Bell,
  Code2,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  parseUniversalCaptions,
  parseSRT, 
  stringifySRT, 
  SubtitleItem,
  calculateDurationAndCPS,
  shiftSubtitleTimings,
  timeStringToMs,
  msToTimeString
} from './utils/srtParser';
import { 
  executeFindAndReplace, 
  executeCleanup, 
  mergeConsecutiveSubtitles,
  splitSubtitle,
  insertSubtitle,
  deleteSubtitle,
  batchDeleteSubtitles,
  createOriginalTimingMap,
  resetSubtitleTimings,
  splitAllLongSubtitles,
  OriginalTimingMap
} from './utils/subtitleOperations';
import {
  GeminiService,
  TranslationResult,
  translateTextGoogle,
  translateBatchGoogle,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  clearStoredGeminiApiKey,
} from './services/gemini';
import { GeminiQuotaDashboard } from './components/GeminiQuotaDashboard';
import { SubtitleStylizerModal } from './components/SubtitleStylizerModal';
import { TranslationSettingsModal } from './components/TranslationSettingsModal';
import { FindReplaceModal } from './components/FindReplaceModal';
import { TimeShiftModal } from './components/TimeShiftModal';
import { GapTimingModal } from './components/GapTimingModal';
import { TextCleanupModal } from './components/TextCleanupModal';
import { WatermarkModal } from './components/WatermarkModal';
import { SubtitleEditorModal } from './components/SubtitleEditorModal';
import { AiCinemaDrawer } from './components/AiCinemaDrawer';
import { StylingStudioDrawer, ActiveStylingConfig, DEFAULT_STYLING_CONFIG } from './components/StylingStudioDrawer';
import { SubtitlePreviewSpaceModal } from './components/SubtitlePreviewSpaceModal';
import { GoogleTranslateSettingsModal } from './components/GoogleTranslateSettingsModal';
import { AiConfigModal } from './components/AiConfigModal';
import { UnifiedDownloadModal } from './components/UnifiedDownloadModal';
import { HomeTabView } from './components/HomeTabView';
import { MobileSubtitleCard, WorkspaceStreamField } from './components/MobileSubtitleCard';
import { TranslatorTabView } from './components/TranslatorTabView';
import { StylingTabView } from './components/StylingTabView';
import { DownloadTabView, DownloadFormat, LastExportNotice } from './components/DownloadTabView';
import { MenuSettingsTabView, SettingsCategoryId, TranslationSubMenuId } from './components/MenuSettingsTabView';
import { ThemeSelector, AppTheme } from './components/ThemeSelector';
import { InfoPopover } from './components/InfoPopover';
import { ConfirmDialogModal } from './components/ConfirmDialogModal';
import { detectLineDirection } from './components/FormattedRichText';
import { useBodyScrollLock } from './utils/scrollLock';
import { getClampedPopoverStyle } from './utils/popoverPlacement';
import { OnScreenSlidersBar } from './components/OnScreenSlidersBar';
import { MySubtitlesDrawer } from './components/MySubtitlesDrawer';
import { TranslatorDrawer } from './components/TranslatorDrawer';
import { GlowingProgressButton } from './components/GlowingProgressButton';
import { WorkspaceDrawer } from './components/WorkspaceDrawer';
import { TextResizePopupModal } from './components/TextResizePopupModal';
import { FontsPopupModal } from './components/FontsPopupModal';
import { 
  TranslationSettings, 
  DEFAULT_TRANSLATION_SETTINGS, 
  SCRIPT_MODES, 
  TARGET_LANGUAGES, 
  TONE_REGISTERS,
  HONORIFIC_OPTIONS,
  ScriptMode, 
  ToneRegister 
} from './services/translationSettings';
import { 
  hasFormatting, 
  stripFormatting,
  formatSubtitlePreview,
  applyGradientsToSubtitles,
  renderStylizedSubtitleHtml,
  computeSubtitleCssStyles,
  generateFormattedSRT, 
  generateASS, 
  generateSSA,
  generateWebVTT, 
  generateCleanSRT,
  generateYouTubeSBV,
  generateLRC,
  generateAndroidPhoneTranscript,
  generateJSONCaptions,
  GRADIENT_PALETTES 
} from './utils/subtitleFormatter';
import { useProgressiveRenderList } from './utils/performance';
import { quotaManager, FeasibilityReport } from './services/quota';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { dbService, ProjectDraft, CrashSnapshot, DetailedStorageBreakdown } from './services/db';
import {
  AppPreferences,
  DEFAULT_APP_PREFERENCES,
  DEFAULT_DEVELOPER_SETTINGS,
  MobileTab,
  GlossaryEntry,
  FullAppBackup,
  SubtitleQcIssue,
  loadAppPreferences,
  saveAppPreferences,
  applyPreferencesToDOM,
  loadGlossary,
  saveGlossary,
  buildGlossaryInstruction,
  clampZoom,
  paddingToContainerSize,
} from './services/appPreferences';
import {
  AndroidSaveMode,
  getAndroidPermissionSnapshot,
  isNativeAndroid,
  exportSubtitleNativeAndroid,
  initAndroidNativeShell,
  pickAndroidExportFolder,
  requestAndroidStoragePermission,
  shareExportedAndroidSubtitle,
  syncAndroidStatusBarTheme,
} from './services/androidNative';
import { invokeRegisteredBackHandlers } from './utils/backNavigation';
import { SubtitleRowEditableCell } from './components/SubtitleRowEditableCell';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

import { 
  URDU_FONT_OPTIONS, 
  ENGLISH_FONT_OPTIONS,
  FontOption,
  CustomFontItem,
  getLocalFontsFromStorage,
  saveLocalFontsToStorage,
  registerUploadedFont
} from './constants/fonts';
export { URDU_FONT_OPTIONS, ENGLISH_FONT_OPTIONS };

export const DEMO_SAMPLE_SUBTITLES: SubtitleItem[] = [
  {
    index: 1,
    startTime: '00:00:01,200',
    endTime: '00:00:04,500',
    text: 'Every great cinematic journey begins with an unspoken truth.',
    translatedText: 'ہر عظیم فلمی سفر ایک ان کہی سچائی سے شروع ہوتا ہے۔',
    googleTranslateText: 'ہر عظیم سنیما کا سفر ایک ناگفتہ بہ حقیقت سے شروع ہوتا ہے۔'
  },
  {
    index: 2,
    startTime: '00:00:05,100',
    endTime: '00:00:08,900',
    text: 'Listen closely to the echoes between the words.',
    translatedText: 'الفاظ کے درمیان گونجتی خاموشی کو غور سے سنیں۔',
    googleTranslateText: 'الفاظ کے درمیان گونج کو قریب سے سنیں۔'
  },
  {
    index: 3,
    startTime: '00:00:09,400',
    endTime: '00:00:13,600',
    text: 'When night falls across the valley, memories start to speak.',
    translatedText: 'جب وادی پر رات اترتی ہے، تو یادیں بولنے لگتی ہیں۔',
    googleTranslateText: 'جب وادی میں رات آتی ہے تو یادیں بولنے لگتی ہیں۔'
  },
  {
    index: 4,
    startTime: '00:00:14,200',
    endTime: '00:00:18,700',
    text: 'We are not just translating subtitles; we are preserving the human soul.',
    translatedText: 'ہم صرف مکالمے ترجمہ نہیں کر رہے، بلکہ انسانی جذبات کو محفوظ کر رہے ہیں۔',
    googleTranslateText: 'ہم صرف ذیلی عنوانات کا ترجمہ نہیں کر رہے ہیں، ہم انسانی روح کو محفوظ کر رہے ہیں۔'
  }
];

const SubtitleRow = memo(({ 
  item, 
  onOpenEditor,
  onTranslateGoogle,
  isSelected = false,
  onToggleSelect,
  visibleColumns = { time: true, original: true, ai: true, google: true },
  originalFont = ENGLISH_FONT_OPTIONS[0].value,
  originalFontSize = 16,
  urduFont = URDU_FONT_OPTIONS[0].value,
  translatedFontSize = 16,
  googleFont = URDU_FONT_OPTIONS[0].value,
  googleFontSize = 16,
  isGlobalFontActive = false,
  globalFont = URDU_FONT_OPTIONS[0].value,
  globalFontSize = 16,
  activeStylingConfig,
  isStylingPreviewActive = true,
  isReadOnly = true,
  onEditOriginal,
  onEditTranslated,
  onEditGoogle,
  onOpenWatermark,
  canUndoBlock = false,
  canRedoBlock = false,
  onUndoBlock,
  onRedoBlock,
  onLongPressField,
  onLongPressColumn,
  editTriggerTarget
}: { 
  item: SubtitleItem; 
  onOpenEditor: (index: number, stream?: WorkspaceStreamField) => void;
  onTranslateGoogle?: (index: number) => Promise<void> | void;
  isSelected?: boolean;
  onToggleSelect?: (index: number) => void;
  visibleColumns?: { time: boolean; original: boolean; ai: boolean; google: boolean };
  originalFont?: string;
  originalFontSize?: number;
  urduFont?: string;
  translatedFontSize?: number;
  googleFont?: string;
  googleFontSize?: number;
  isGlobalFontActive?: boolean;
  globalFont?: string;
  globalFontSize?: number;
  activeStylingConfig?: ActiveStylingConfig;
  isStylingPreviewActive?: boolean;
  isReadOnly?: boolean;
  onEditOriginal?: (index: number, text: string) => void;
  onEditTranslated?: (index: number, text: string) => void;
  onEditGoogle?: (index: number, text: string) => void;
  onOpenWatermark?: () => void;
  canUndoBlock?: boolean;
  canRedoBlock?: boolean;
  onUndoBlock?: (index: number) => void;
  onRedoBlock?: (index: number) => void;
  onLongPressField?: (index: number, field: WorkspaceStreamField, pos: { x: number; y: number }) => void;
  onLongPressColumn?: (field: WorkspaceStreamField, pos: { x: number; y: number }) => void;
  editTriggerTarget?: { index: number; field: WorkspaceStreamField; nonce: number } | null;
}) => {
  const [isTranslatingRow, setIsTranslatingRow] = useState(false);
  const [copied, setCopied] = useState(false);

  const colLongPressRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    startX: number;
    startY: number;
  }>({ timer: null, startX: 0, startY: 0 });

  const clearColLongPress = () => {
    if (colLongPressRef.current.timer) {
      clearTimeout(colLongPressRef.current.timer);
      colLongPressRef.current.timer = null;
    }
  };

  const startColLongPress = (
    e: React.TouchEvent<HTMLTableCellElement>,
    field: WorkspaceStreamField
  ) => {
    if (!onLongPressColumn) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-sub-cell="true"], button, input, textarea')) return;
    const t = e.touches[0];
    if (!t) return;
    colLongPressRef.current.startX = t.clientX;
    colLongPressRef.current.startY = t.clientY;
    const pos = { x: t.clientX, y: t.clientY };
    clearColLongPress();
    colLongPressRef.current.timer = setTimeout(() => {
      colLongPressRef.current.timer = null;
      onLongPressColumn(field, pos);
    }, 480);
  };

  const moveColLongPress = (e: React.TouchEvent<HTMLTableCellElement>) => {
    if (!colLongPressRef.current.timer) return;
    const t = e.touches[0];
    if (!t) return;
    if (
      Math.abs(t.clientX - colLongPressRef.current.startX) > 8 ||
      Math.abs(t.clientY - colLongPressRef.current.startY) > 8
    ) {
      clearColLongPress();
    }
  };

  const handleColContextMenu = (
    e: React.MouseEvent<HTMLTableCellElement>,
    field: WorkspaceStreamField
  ) => {
    if (!onLongPressColumn) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-sub-cell="true"], button, input, textarea')) return;
    e.preventDefault();
    e.stopPropagation();
    onLongPressColumn(field, { x: e.clientX, y: e.clientY });
  };

  const localText = item.translatedText || '';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!localText) return;
    const clean = localText.replace(/<[^>]+>/g, '');
    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isStylized = useMemo(() => hasFormatting(localText), [localText]);

  // Determine which streams should receive styling based on activeStylingConfig.targetStreams
  const shouldStyleOriginal = Boolean(
    isStylingPreviewActive && 
    activeStylingConfig &&
    (activeStylingConfig.targetStreams === 'all' || 
     activeStylingConfig.targetStreams === 'both' || 
     activeStylingConfig.targetStreams === 'original')
  );

  const shouldStyleAi = Boolean(
    isStylingPreviewActive && 
    activeStylingConfig &&
    (activeStylingConfig.targetStreams === 'all' || 
     activeStylingConfig.targetStreams === 'both' || 
     activeStylingConfig.targetStreams === 'translated')
  );

  const shouldStyleGoogle = Boolean(
    isStylingPreviewActive && 
    activeStylingConfig &&
    (activeStylingConfig.targetStreams === 'all' || 
     activeStylingConfig.targetStreams === 'google')
  );

  const hasOriginalFormatting = useMemo(() => hasFormatting(item.text || ''), [item.text]);
  const hasAiFormatting = isStylized;
  const hasGoogleFormatting = useMemo(() => hasFormatting(item.googleTranslateText || ''), [item.googleTranslateText]);

  // Computed CSS Styles (Outlines, Shadows, Glows, Backdrop Box, Typography, Animations)
  const originalCss = useMemo(() => {
    if (!shouldStyleOriginal && !hasOriginalFormatting) return { style: {}, className: '' };
    return computeSubtitleCssStyles({
      textOutline: activeStylingConfig?.textOutline,
      customOutlineColor: activeStylingConfig?.customOutlineColor,
      outlineOpacity: activeStylingConfig?.outlineOpacity,
      textShadow: activeStylingConfig?.textShadow,
      customShadowColor: activeStylingConfig?.customShadowColor,
      shadowBlur: activeStylingConfig?.shadowBlur,
      shadowOffsetX: activeStylingConfig?.shadowOffsetX,
      shadowOffsetY: activeStylingConfig?.shadowOffsetY,
      backdropBox: activeStylingConfig?.backdropBox,
      backdropPadding: activeStylingConfig?.backdropPadding,
      backdropRadius: activeStylingConfig?.backdropRadius,
      backdropOpacity: activeStylingConfig?.backdropOpacity,
      backdropBlur: activeStylingConfig?.backdropBlur,
      fontWeight: activeStylingConfig?.fontWeight,
      letterSpacing: activeStylingConfig?.letterSpacing,
      lineHeight: activeStylingConfig?.lineHeight,
      textAlign: activeStylingConfig?.textAlign,
      transformCase: activeStylingConfig?.transformCase,
      boldEmphasis: activeStylingConfig?.boldEmphasis,
      italicize: activeStylingConfig?.italicize,
      animation: activeStylingConfig?.animation,
      activePaletteColors: activeStylingConfig?.customColors || GRADIENT_PALETTES.find(p => p.id === activeStylingConfig?.paletteId)?.colors
    });
  }, [shouldStyleOriginal, hasOriginalFormatting, activeStylingConfig]);

  const aiCss = useMemo(() => {
    if (!shouldStyleAi && !hasAiFormatting) return { style: {}, className: '' };
    return computeSubtitleCssStyles({
      textOutline: activeStylingConfig?.textOutline,
      customOutlineColor: activeStylingConfig?.customOutlineColor,
      outlineOpacity: activeStylingConfig?.outlineOpacity,
      textShadow: activeStylingConfig?.textShadow,
      customShadowColor: activeStylingConfig?.customShadowColor,
      shadowBlur: activeStylingConfig?.shadowBlur,
      shadowOffsetX: activeStylingConfig?.shadowOffsetX,
      shadowOffsetY: activeStylingConfig?.shadowOffsetY,
      backdropBox: activeStylingConfig?.backdropBox,
      backdropPadding: activeStylingConfig?.backdropPadding,
      backdropRadius: activeStylingConfig?.backdropRadius,
      backdropOpacity: activeStylingConfig?.backdropOpacity,
      backdropBlur: activeStylingConfig?.backdropBlur,
      fontWeight: activeStylingConfig?.fontWeight,
      letterSpacing: activeStylingConfig?.letterSpacing,
      lineHeight: activeStylingConfig?.lineHeight,
      textAlign: activeStylingConfig?.textAlign,
      boldEmphasis: activeStylingConfig?.boldEmphasis,
      italicize: activeStylingConfig?.italicize,
      animation: activeStylingConfig?.animation,
      activePaletteColors: activeStylingConfig?.customColors || GRADIENT_PALETTES.find(p => p.id === activeStylingConfig?.paletteId)?.colors
    });
  }, [shouldStyleAi, hasAiFormatting, activeStylingConfig]);

  const googleCss = useMemo(() => {
    if (!shouldStyleGoogle && !hasGoogleFormatting) return { style: {}, className: '' };
    return computeSubtitleCssStyles({
      textOutline: activeStylingConfig?.textOutline,
      customOutlineColor: activeStylingConfig?.customOutlineColor,
      outlineOpacity: activeStylingConfig?.outlineOpacity,
      textShadow: activeStylingConfig?.textShadow,
      customShadowColor: activeStylingConfig?.customShadowColor,
      shadowBlur: activeStylingConfig?.shadowBlur,
      shadowOffsetX: activeStylingConfig?.shadowOffsetX,
      shadowOffsetY: activeStylingConfig?.shadowOffsetY,
      backdropBox: activeStylingConfig?.backdropBox,
      backdropPadding: activeStylingConfig?.backdropPadding,
      backdropRadius: activeStylingConfig?.backdropRadius,
      backdropOpacity: activeStylingConfig?.backdropOpacity,
      backdropBlur: activeStylingConfig?.backdropBlur,
      fontWeight: activeStylingConfig?.fontWeight,
      letterSpacing: activeStylingConfig?.letterSpacing,
      lineHeight: activeStylingConfig?.lineHeight,
      animation: activeStylingConfig?.animation,
      activePaletteColors: activeStylingConfig?.customColors || GRADIENT_PALETTES.find(p => p.id === activeStylingConfig?.paletteId)?.colors
    });
  }, [shouldStyleGoogle, hasGoogleFormatting, activeStylingConfig]);

  // Rendered Display HTML with tags and gradient colors
  const originalDisplayHtml = useMemo(() => {
    if (hasOriginalFormatting) return item.text;
    if (shouldStyleOriginal && item.text && activeStylingConfig) {
      return renderStylizedSubtitleHtml(
        item.text,
        (item.index || 1) - 1,
        activeStylingConfig.paletteId,
        activeStylingConfig.gradientMode,
        {
          customColors: activeStylingConfig.customColors,
          boldEmphasis: activeStylingConfig.boldEmphasis,
          italicize: activeStylingConfig.italicize,
          transformCase: activeStylingConfig.transformCase
        }
      );
    }
    return null;
  }, [item.text, item.index, hasOriginalFormatting, shouldStyleOriginal, activeStylingConfig]);

  const aiDisplayHtml = useMemo(() => {
    if (hasAiFormatting) return localText;
    if (shouldStyleAi && localText && activeStylingConfig) {
      return renderStylizedSubtitleHtml(
        localText,
        (item.index || 1) - 1,
        activeStylingConfig.paletteId,
        activeStylingConfig.gradientMode,
        {
          customColors: activeStylingConfig.customColors,
          boldEmphasis: activeStylingConfig.boldEmphasis,
          italicize: activeStylingConfig.italicize
        }
      );
    }
    return null;
  }, [localText, item.index, hasAiFormatting, shouldStyleAi, activeStylingConfig]);

  const googleDisplayHtml = useMemo(() => {
    if (!item.googleTranslateText) return null;
    if (hasGoogleFormatting) return item.googleTranslateText;
    if (shouldStyleGoogle && activeStylingConfig) {
      return renderStylizedSubtitleHtml(
        item.googleTranslateText,
        (item.index || 1) - 1,
        activeStylingConfig.paletteId,
        activeStylingConfig.gradientMode,
        {
          customColors: activeStylingConfig.customColors,
          boldEmphasis: activeStylingConfig.boldEmphasis,
          italicize: activeStylingConfig.italicize
        }
      );
    }
    return null;
  }, [item.googleTranslateText, item.index, hasGoogleFormatting, shouldStyleGoogle, activeStylingConfig]);

  const isRomanOrLatin = useMemo(() => {
    if (!localText) return false;
    const clean = localText.replace(/<[^>]+>|\{[^}]+\}/g, '');
    const urduCount = (clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    if (urduCount > 0) return false;
    const latinCount = (clean.match(/[a-zA-Z]/g) || []).length;
    return latinCount > 0;
  }, [localText]);

  const isBilingual = useMemo(() => {
    const clean = localText.replace(/<[^>]+>|\{[^}]+\}/g, '');
    return clean.includes('\n') && /[a-zA-Z]/.test(clean) && /[\u0600-\u06FF\u0750-\u077F]/.test(clean);
  }, [localText]);

  const isGoogleRomanOrLatin = useMemo(() => {
    if (!item.googleTranslateText) return false;
    const clean = item.googleTranslateText.replace(/<[^>]+>|\{[^}]+\}/g, '');
    const urduCount = (clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    if (urduCount > 0) return false;
    const latinCount = (clean.match(/[a-zA-Z]/g) || []).length;
    return latinCount > 0;
  }, [item.googleTranslateText]);

  const timingInfo = useMemo(() => {
    return calculateDurationAndCPS(item.translatedText || item.text, item.startTime, item.endTime);
  }, [item.translatedText, item.text, item.startTime, item.endTime]);

  const hasSoundCues = useMemo(() => {
    return /\[[^\]]+\]|\([^\)]+\)/.test(item.text);
  }, [item.text]);

  const handleTranslateRow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTranslateGoogle) return;
    setIsTranslatingRow(true);
    try {
      await onTranslateGoogle(item.index);
    } finally {
      setIsTranslatingRow(false);
    }
  };

  const origDir = useMemo(() => detectLineDirection(item.text || ''), [item.text]);

  // Active Typography Styles per column
  const effectiveOriginalFont = isGlobalFontActive ? globalFont : (origDir === 'rtl' ? urduFont : originalFont);
  const effectiveOriginalSize = isGlobalFontActive ? globalFontSize : originalFontSize;

  const effectiveAiFont = isGlobalFontActive ? globalFont : (isRomanOrLatin ? 'inherit' : urduFont);
  const effectiveAiSize = isGlobalFontActive ? globalFontSize : translatedFontSize;

  const effectiveGoogleFont = isGlobalFontActive ? globalFont : (isGoogleRomanOrLatin ? 'inherit' : googleFont);
  const effectiveGoogleSize = isGlobalFontActive ? globalFontSize : googleFontSize;

  return (
    <tr
      onDoubleClick={() => onOpenEditor(item.index)}
      className={cn(
        'group transition-colors border-b cursor-default',
        item.index === 1 && 'border-l-2 border-l-amber-500'
      )}
      style={{
        borderColor: 'var(--theme-border)',
        backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'transparent',
      }}
      title={item.index === 1 ? 'Block #1 (Watermark). Double-click to edit' : 'Double-click to open Editor'}
    >
      {/* Sticky Checkbox and Index */}
      <td
        className="sticky left-0 z-10 p-1.5 text-[10px] font-mono opacity-80 align-top w-10 text-center tabular-nums border-r"
        style={{
          backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(item.index)}
            className="rounded cursor-pointer w-3.5 h-3.5"
            title={`Select row #${item.index}`}
          />
          <span className="font-semibold">{item.index}</span>

          {item.index === 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWatermark?.();
              }}
              className="mt-0.5 px-1 py-0.5 rounded border border-amber-500/35 text-amber-500 font-semibold text-[8px] uppercase flex items-center gap-0.5 cursor-pointer select-none"
              style={{ backgroundColor: 'var(--theme-elevated)' }}
              title="Block #1 Watermark"
            >
              <Stamp size={8} />
            </button>
          )}

          {item.styleColor && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.styleColor }}
              title={`Color: ${item.styleColor}`}
            />
          )}
        </div>
      </td>

      {/* Timing Column */}
      {visibleColumns.time && (
        <td className="p-1.5 text-[9.5px] font-mono opacity-75 leading-tight align-top w-28 shrink-0 tabular-nums">
          <div className="font-medium">{item.startTime}</div>
          <div className="opacity-35">↓</div>
          <div className="font-medium">{item.endTime}</div>

          <div className="flex items-center gap-1 mt-1 flex-wrap text-[8.5px]">
            <span className="opacity-70">{timingInfo.durationSec}s</span>
            <span>·</span>
            <span
              className={cn(
                'font-mono',
                timingInfo.cps > 25 ? 'text-red-500 font-semibold' : timingInfo.cps > 18 ? 'text-amber-500' : 'opacity-70'
              )}
              title="Characters per second"
            >
              {timingInfo.cps} cps
            </span>
          </div>
        </td>
      )}

      {/* Original Language Column */}
      {visibleColumns.original && (
        <td
          onTouchStart={(e) => startColLongPress(e, 'orig')}
          onTouchMove={moveColLongPress}
          onTouchEnd={clearColLongPress}
          onTouchCancel={clearColLongPress}
          onContextMenu={(e) => handleColContextMenu(e, 'orig')}
          className="p-1.5 leading-snug font-medium transition-colors align-top min-w-[200px]"
          style={{
            fontSize: `${effectiveOriginalSize}px`,
            fontFamily: effectiveOriginalFont,
          }}
        >
          <div data-sub-cell="true" className="w-full">
            <SubtitleRowEditableCell
              value={item.text || ''}
              isReadOnly={isReadOnly}
              onCommit={(newText) => onEditOriginal?.(item.index, newText)}
              fontFamily={effectiveOriginalFont}
              fontSize={effectiveOriginalSize}
              dir={origDir}
              className={cn(origDir === 'rtl' ? 'text-right font-urdu' : 'text-left', originalCss.className)}
              style={originalCss.style}
              displayHtml={originalDisplayHtml}
              placeholder="Source text..."
              emptyLabel="—"
              onLongPress={(pos) => onLongPressField?.(item.index, 'orig', pos)}
              editTriggerNonce={
                editTriggerTarget?.index === item.index && editTriggerTarget.field === 'orig'
                  ? editTriggerTarget.nonce
                  : undefined
              }
            />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[9px] opacity-55 font-sans tabular-nums">
            <span>{(item.text || '').length}c</span>
            {hasSoundCues && <span>· Cue</span>}
            {(hasOriginalFormatting || shouldStyleOriginal) && <span>· Styled</span>}
          </div>
        </td>
      )}

      {/* AI Translated Column */}
      {visibleColumns.ai && (
        <td
          onTouchStart={(e) => startColLongPress(e, 'ai')}
          onTouchMove={moveColLongPress}
          onTouchEnd={clearColLongPress}
          onTouchCancel={clearColLongPress}
          onContextMenu={(e) => handleColContextMenu(e, 'ai')}
          className="p-1.5 align-top min-w-[200px]"
        >
          <div className="py-0.5 group/cell relative w-full">
            <div data-sub-cell="true" className="w-full">
              <SubtitleRowEditableCell
                value={item.translatedText || ''}
                isReadOnly={isReadOnly}
                onCommit={(newText) => onEditTranslated?.(item.index, newText)}
                fontFamily={effectiveAiFont}
                fontSize={effectiveAiSize}
                dir={isBilingual ? 'auto' : isRomanOrLatin ? 'ltr' : detectLineDirection(localText || 'ا')}
                className={cn(isRomanOrLatin ? 'text-left font-sans' : 'text-right font-urdu', aiCss.className)}
                style={aiCss.style}
                displayHtml={aiDisplayHtml}
                placeholder="ترجمہ..."
                emptyLabel="—"
                onLongPress={(pos) => onLongPressField?.(item.index, 'ai', pos)}
                editTriggerNonce={
                  editTriggerTarget?.index === item.index && editTriggerTarget.field === 'ai'
                    ? editTriggerTarget.nonce
                    : undefined
                }
              />
            </div>

            <div className="flex items-center justify-between gap-1.5 mt-1 text-[9px] font-mono opacity-60 tabular-nums">
              <div className="flex items-center gap-1 flex-wrap">
                <span>{localText.replace(/<[^>]+>/g, '').length}c</span>
                {isRomanOrLatin && <span>· Roman</span>}
                {(isStylized || shouldStyleAi) && <span style={{ color: 'var(--theme-accent)' }}>· Styled</span>}
              </div>

              {localText && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  title="Copy translation"
                >
                  {copied ? <Check size={9} style={{ color: 'var(--theme-accent)' }} /> : <Copy size={9} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>
        </td>
      )}

      {/* Neutral / Google Compare Column */}
      {visibleColumns.google && (
        <td
          onTouchStart={(e) => startColLongPress(e, 'google')}
          onTouchMove={moveColLongPress}
          onTouchEnd={clearColLongPress}
          onTouchCancel={clearColLongPress}
          onContextMenu={(e) => handleColContextMenu(e, 'google')}
          className="p-1.5 align-top min-w-[200px]"
        >
          <div className="space-y-1">
            {(item.googleTranslateText && item.googleTranslateText !== 'Translation Error') || !isReadOnly ? (
              <div
                data-sub-cell="true"
                className="w-full px-1.5 py-1 rounded-md border"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                <SubtitleRowEditableCell
                  value={item.googleTranslateText === 'Translation Error' ? '' : (item.googleTranslateText || '')}
                  isReadOnly={isReadOnly}
                  onCommit={(newText) => onEditGoogle?.(item.index, newText)}
                  fontFamily={effectiveGoogleFont}
                  fontSize={effectiveGoogleSize}
                  dir={item.googleTranslateText ? (isGoogleRomanOrLatin ? 'ltr' : 'rtl') : 'rtl'}
                  className={cn(isGoogleRomanOrLatin ? 'text-left font-sans' : 'text-right font-urdu', googleCss.className)}
                  style={googleCss.style}
                  displayHtml={googleDisplayHtml}
                  placeholder="Neutral translation..."
                  emptyLabel="—"
                  onLongPress={(pos) => onLongPressField?.(item.index, 'google', pos)}
                  editTriggerNonce={
                    editTriggerTarget?.index === item.index && editTriggerTarget.field === 'google'
                      ? editTriggerTarget.nonce
                      : undefined
                  }
                />
                {(hasGoogleFormatting || shouldStyleGoogle) && (
                  <div className="mt-0.5 text-[8.5px] font-mono opacity-60">Styled</div>
                )}
              </div>
            ) : (
              <div
                data-sub-cell="true"
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLongPressField?.(item.index, 'google', { x: e.clientX, y: e.clientY });
                }}
                className="flex flex-col items-center justify-center p-1.5 rounded-md border border-dashed gap-1 text-center"
                style={{ borderColor: 'var(--theme-border)' }}
              >
                <span className="opacity-45 text-[9.5px]">—</span>
                {onTranslateGoogle && (
                  <button
                    type="button"
                    onClick={handleTranslateRow}
                    disabled={isTranslatingRow}
                    className="flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-semibold cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    {isTranslatingRow ? (
                      <Loader2 size={9} className="animate-spin" style={{ color: 'var(--theme-accent)' }} />
                    ) : (
                      <Languages size={9} style={{ color: 'var(--theme-accent)' }} />
                    )}
                    <span>Translate</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      )}

      {/* Action Cell: Studio Edit + Per-Block Undo/Redo */}
      <td className="p-1.5 align-top w-16 text-center">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenEditor(item.index)}
            className="flex items-center justify-center gap-1 w-full min-h-[26px] px-1.5 py-0.5 rounded-md border font-semibold text-[10px] transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            title={`Edit line #${item.index}`}
          >
            <Edit3 size={10} style={{ color: 'var(--theme-accent)' }} />
            <span>Edit</span>
          </button>

          {(onUndoBlock || onRedoBlock) && (
            <div className="flex items-center justify-center gap-1 w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUndoBlock?.(item.index);
                }}
                disabled={!canUndoBlock}
                className="flex-1 min-h-[24px] rounded border disabled:opacity-30 cursor-pointer flex items-center justify-center"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title={`Undo #${item.index}`}
              >
                <Undo2 size={10} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRedoBlock?.(item.index);
                }}
                disabled={!canRedoBlock}
                className="flex-1 min-h-[24px] rounded border disabled:opacity-30 cursor-pointer flex items-center justify-center"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title={`Redo #${item.index}`}
              >
                <Redo2 size={10} />
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Ultra-strict Selective Component Updating:
  // If row item, selection, styles, fonts, block undo state, and column visibility are identical, SKIP rerender!
  if (prevProps.isReadOnly !== nextProps.isReadOnly) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.canUndoBlock !== nextProps.canUndoBlock) return false;
  if (prevProps.canRedoBlock !== nextProps.canRedoBlock) return false;
  if (prevProps.isStylingPreviewActive !== nextProps.isStylingPreviewActive) return false;
  if (prevProps.activeStylingConfig !== nextProps.activeStylingConfig) return false;
  if (prevProps.isGlobalFontActive !== nextProps.isGlobalFontActive) return false;
  if (prevProps.globalFont !== nextProps.globalFont || prevProps.globalFontSize !== nextProps.globalFontSize) return false;
  if (prevProps.originalFont !== nextProps.originalFont || prevProps.originalFontSize !== nextProps.originalFontSize) return false;
  if (prevProps.urduFont !== nextProps.urduFont || prevProps.translatedFontSize !== nextProps.translatedFontSize) return false;
  if (prevProps.googleFont !== nextProps.googleFont || prevProps.googleFontSize !== nextProps.googleFontSize) return false;

  const prevTargetHere = prevProps.editTriggerTarget?.index === prevProps.item.index ? prevProps.editTriggerTarget : null;
  const nextTargetHere = nextProps.editTriggerTarget?.index === nextProps.item.index ? nextProps.editTriggerTarget : null;
  if (prevTargetHere?.nonce !== nextTargetHere?.nonce || prevTargetHere?.field !== nextTargetHere?.field) {
    return false;
  }

  if (prevProps.visibleColumns !== nextProps.visibleColumns) {
    if (
      prevProps.visibleColumns?.time !== nextProps.visibleColumns?.time ||
      prevProps.visibleColumns?.original !== nextProps.visibleColumns?.original ||
      prevProps.visibleColumns?.ai !== nextProps.visibleColumns?.ai ||
      prevProps.visibleColumns?.google !== nextProps.visibleColumns?.google
    ) {
      return false;
    }
  }

  const p = prevProps.item;
  const n = nextProps.item;
  if (p === n) return true;
  return (
    p.index === n.index &&
    p.text === n.text &&
    p.translatedText === n.translatedText &&
    p.googleTranslateText === n.googleTranslateText &&
    p.startTime === n.startTime &&
    p.endTime === n.endTime &&
    p.styleColor === n.styleColor
  );
});

SubtitleRow.displayName = 'SubtitleRow';

// Resizable Container Component: attaches drag listeners only while dragging and stays auto-height on < lg mobile
const ResizableBox = ({ 
  children, 
  initialHeight = 400, 
  minHeight = 200, 
  maxHeight = 1600,
  title,
  icon: Icon,
  actions,
  isFullScreen = false,
  onFullScreenToggle
}: { 
  children: React.ReactNode; 
  initialHeight?: number; 
  minHeight?: number; 
  maxHeight?: number;
  title: string;
  icon: any;
  actions?: React.ReactNode;
  isFullScreen?: boolean;
  onFullScreenToggle?: () => void;
}) => {
  const [height, setHeight] = useState(initialHeight);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const isResizing = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(initialHeight);

  useEffect(() => {
    setHeight(initialHeight);
  }, [initialHeight]);

  useEffect(() => {
    const onResizeWin = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResizeWin);
    return () => window.removeEventListener('resize', onResizeWin);
  }, []);

  const isProjectControls = title.toLowerCase().includes('project control');

  const toggleCollapse = useCallback(() => {
    if (isProjectControls) return;
    setIsCollapsed(prev => !prev);
  }, [isProjectControls]);

  const resize = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing.current) return;
    if (e.cancelable) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startYRef.current;
    const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + deltaY));
    setHeight(newHeight);
  }, [minHeight, maxHeight]);

  const stopResizing = useCallback(() => {
    if (!isResizing.current) return;
    isResizing.current = false;
    setIsDragging(false);

    window.removeEventListener('mousemove', resize);
    window.removeEventListener('mouseup', stopResizing);
    window.removeEventListener('touchmove', resize);
    window.removeEventListener('touchend', stopResizing);
    window.removeEventListener('touchcancel', stopResizing);

    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.touchAction = '';
  }, [resize]);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      startYRef.current = e.touches[0].clientY;
    } else {
      startYRef.current = e.clientY;
    }

    const container = document.getElementById(`resizable-${title}`);
    if (container) {
      startHeightRef.current = container.getBoundingClientRect().height;
    } else {
      startHeightRef.current = height;
    }

    isResizing.current = true;
    setIsDragging(true);

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.touchAction = 'none';

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('touchmove', resize, { passive: false });
    window.addEventListener('touchend', stopResizing);
    window.addEventListener('touchcancel', stopResizing);
  }, [height, title, resize, stopResizing]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('touchend', stopResizing);
      window.removeEventListener('touchcancel', stopResizing);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.touchAction = '';
    };
  }, [resize, stopResizing]);

  const handleResetHeight = useCallback(() => {
    setHeight(initialHeight);
  }, [initialHeight]);

  return (
    <div
      id={`resizable-${title}`}
      className={cn(
        'rounded-xl border flex flex-col relative theme-card',
        !isDragging && 'transition-[height,border-color] duration-200',
        isFullScreen ? 'fixed inset-0 z-[100] h-[100dvh] w-screen rounded-none' : ''
      )}
      style={{
        height: isFullScreen ? '100dvh' : isCollapsed ? 'auto' : isDesktop ? `${height}px` : 'auto',
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border)',
      }}
    >
      {/* Slim Container Header — touching anywhere on header title row expands/collapses */}
      <div
        className="px-2.5 py-2 border-b relative z-30 shrink-0 rounded-t-xl"
        style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
      >
        <div className="flex flex-col gap-2 w-full">
          <div
            onClick={toggleCollapse}
            className={cn(
              'flex items-center justify-between gap-2 shrink-0 w-full select-none',
              !isProjectControls && 'cursor-pointer hover:opacity-85 transition-opacity'
            )}
            title={!isProjectControls ? (isCollapsed ? 'Expand' : 'Collapse') : undefined}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon size={14} className="shrink-0" style={{ color: 'var(--theme-accent)' }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap truncate">
                {title}
              </span>
              {!isProjectControls && (
                <ChevronDown
                  size={13}
                  className={cn('opacity-55 transition-transform duration-150 shrink-0', isCollapsed && '-rotate-90')}
                />
              )}
            </div>
            {onFullScreenToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFullScreenToggle();
                }}
                className="p-1.5 rounded-md border hover:opacity-85 transition-opacity cursor-pointer shrink-0"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 relative z-40 shrink-0"
          >
            {actions}
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div
          className={cn(
            'relative z-10',
            isDesktop || isFullScreen ? 'flex-1 min-h-0 overflow-auto' : ''
          )}
        >
          {children}
        </div>
      )}

      {!isFullScreen && !isCollapsed && isDesktop && (
        <div
          className="border-t py-1 px-3 flex items-center justify-center shrink-0 select-none rounded-b-xl"
          style={{ touchAction: 'none', backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div
            role="separator"
            aria-orientation="horizontal"
            tabIndex={0}
            onMouseDown={startResizing}
            onTouchStart={startResizing}
            onDoubleClick={handleResetHeight}
            className={cn(
              'group h-3.5 w-24 rounded-full flex items-center justify-center gap-1 cursor-row-resize touch-none select-none transition-colors px-2',
              isDragging ? 'text-white' : 'border opacity-75 hover:opacity-100'
            )}
            style={
              isDragging
                ? { backgroundColor: 'var(--theme-accent)' }
                : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
            }
            title="Drag to resize height (double-click to reset)"
          >
            <GripHorizontal size={11} />
            <span className="text-[8px] font-mono uppercase">
              {isDragging ? `${Math.round(height)}px` : 'Resize'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [context, setContext] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGoogleTranslatingAll, setIsGoogleTranslatingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'saved' | 'not-saved' }[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [detectedFormat, setDetectedFormat] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGeminiConnected, setIsGeminiConnected] = useState(false);
  const [geminiConnectStatus, setGeminiConnectStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [googleConnectStatus, setGoogleConnectStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [analyzeStatus, setAnalyzeStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-4-hydrogen');
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => getStoredGeminiApiKey());
  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  
  // Performance Settings - balanced concurrency to prevent 429 rate limits & browser hangs
  const [geminiBatchSize, setGeminiBatchSize] = useState<number>(10);
  const [googleBatchSize, setGoogleBatchSize] = useState<number>(20);
  const [geminiWorkers, setGeminiWorkers] = useState<number>(2); // 2 workers optimal for Gemini 15 RPM
  const [googleWorkers, setGoogleWorkers] = useState<number>(5);
  const [geminiDelay, setGeminiDelay] = useState<number>(1200);

  const [translationSpeed, setTranslationSpeed] = useState<number>(0); // items per second

  const [sessionId, setSessionId] = useState<string>('');
  
  // Display & Typography Settings (Compact uniform 13px default across all streams)
  const [translatedFontSize, setTranslatedFontSize] = useState<number>(13);
  const [originalFontSize, setOriginalFontSize] = useState<number>(13);
  const [googleFontSize, setGoogleFontSize] = useState<number>(13);
  const [urduFont, setUrduFont] = useState<string>(URDU_FONT_OPTIONS[0].value);
  const [originalFont, setOriginalFont] = useState<string>(ENGLISH_FONT_OPTIONS[0].value);
  const [googleFont, setGoogleFont] = useState<string>(URDU_FONT_OPTIONS[0].value);
  const [isGlobalFontActive, setIsGlobalFontActive] = useState<boolean>(false);
  const [globalFont, setGlobalFont] = useState<string>(URDU_FONT_OPTIONS[0].value);
  const [globalFontSize, setGlobalFontSize] = useState<number>(13);
  const [fontTarget, setFontTarget] = useState<'global' | 'original' | 'ai' | 'google'>('global');
  const [fontsActiveTab, setFontsActiveTab] = useState<'english' | 'urdu' | 'local'>('urdu');
  const [localFonts, setLocalFonts] = useState<CustomFontItem[]>(() => getLocalFontsFromStorage());
  const [customFontInputName, setCustomFontInputName] = useState<string>('');
  const [isUploadingFont, setIsUploadingFont] = useState<boolean>(false);

  const [isTextResizeOpen, setIsTextResizeOpen] = useState(false);
  const [isFontsOpen, setIsFontsOpen] = useState(false);
  const [previewDisplayMode, setPreviewDisplayMode] = useState<'rendered' | 'plain'>('rendered');

  // Draft memory states: settings remain in draft until explicitly applied
  const [draftOriginalFontSize, setDraftOriginalFontSize] = useState<number>(13);
  const [draftTranslatedFontSize, setDraftTranslatedFontSize] = useState<number>(13);
  const [draftGoogleFontSize, setDraftGoogleFontSize] = useState<number>(13);
  const [draftGlobalFontSize, setDraftGlobalFontSize] = useState<number>(13);

  const [draftOriginalFont, setDraftOriginalFont] = useState<string>(ENGLISH_FONT_OPTIONS[0].value);
  const [draftUrduFont, setDraftUrduFont] = useState<string>(URDU_FONT_OPTIONS[0].value);
  const [draftGoogleFont, setDraftGoogleFont] = useState<string>(URDU_FONT_OPTIONS[0].value);
  const [draftGlobalFont, setDraftGlobalFont] = useState<string>(URDU_FONT_OPTIONS[0].value);
  const [draftIsGlobalFontActive, setDraftIsGlobalFontActive] = useState<boolean>(false);
  const [draftFontTarget, setDraftFontTarget] = useState<'global' | 'original' | 'ai' | 'google'>('global');

  const [isStylizerOpen, setIsStylizerOpen] = useState(false);
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>(DEFAULT_TRANSLATION_SETTINGS);
  const [isTranslationSettingsModalOpen, setIsTranslationSettingsModalOpen] = useState(false);
  
  // Active Styling Studio Configuration & Live Workspace Preview Toggle
  // Default theme styling (plain black/white text & basic fonts) stays active until user applies custom style
  const [activeStylingConfig, setActiveStylingConfig] = useState<ActiveStylingConfig>(DEFAULT_STYLING_CONFIG);
  const [isWorkspaceStylingPreview, setIsWorkspaceStylingPreview] = useState<boolean>(false);
  const [hasAppliedCustomStyle, setHasAppliedCustomStyle] = useState<boolean>(false);

  // Stable references for high-speed memoized rendering
  const subtitlesRef = useRef(subtitles);
  subtitlesRef.current = subtitles;
  const translationSettingsRef = useRef(translationSettings);
  translationSettingsRef.current = translationSettings;

  // Studio Drawers & Dedicated Modals
  const [isAiCinemaOpen, setIsAiCinemaOpen] = useState(false);
  const [isStylingDrawerOpen, setIsStylingDrawerOpen] = useState(false);
  const [isPreviewSpaceOpen, setIsPreviewSpaceOpen] = useState(false);
  const [isGoogleSettingsOpen, setIsGoogleSettingsOpen] = useState(false);
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false);
  const [isUnifiedDownloadOpen, setIsUnifiedDownloadOpen] = useState(false);

  // Mobile-First Preferences, 6-Tab Navigation, Drafts, Crash Recovery & Glossary
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadAppPreferences());
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const [activeTab, setActiveTab] = useState<MobileTab>(() => loadAppPreferences().defaultStartupTab);
  const [isHomeDrawerOpen, setIsHomeDrawerOpen] = useState(false);
  const [isTranslatorDrawerOpen, setIsTranslatorDrawerOpen] = useState(false);
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [isOnScreenSlidersOpen, setIsOnScreenSlidersOpen] = useState(false);
  const [focusedSettingsCategory, setFocusedSettingsCategory] = useState<SettingsCategoryId | null>(null);
  const [focusedTranslationSub, setFocusedTranslationSub] = useState<TranslationSubMenuId | null>(null);
  const [hasPendingStyleBake, setHasPendingStyleBake] = useState(false);

  useEffect(() => {
    setIsHomeDrawerOpen(false);
    setIsTranslatorDrawerOpen(false);
    setIsWorkspaceDrawerOpen(false);
  }, [activeTab]);
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => loadGlossary());
  const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const activeDraftIdRef = useRef(activeDraftId);
  activeDraftIdRef.current = activeDraftId;
  const fileNameRef = useRef(fileName);
  fileNameRef.current = fileName;
  const detectedFormatRef = useRef(detectedFormat);
  detectedFormatRef.current = detectedFormat;
  const contextRef = useRef(context);
  contextRef.current = context;
  const customPromptRef = useRef(customPrompt);
  customPromptRef.current = customPrompt;
  const activeStylingConfigRef = useRef(activeStylingConfig);
  activeStylingConfigRef.current = activeStylingConfig;
  const [crashSnapshot, setCrashSnapshot] = useState<CrashSnapshot | null>(null);
  const [storageBreakdown, setStorageBreakdown] = useState<DetailedStorageBreakdown>({
    draftsCount: 0,
    subtitlesInActive: 0,
    logsCount: 0,
    estimatedBytes: 0,
    localStorageBytes: 0,
    activeProjectBytes: 0,
    crashSnapshotBytes: 0,
    crashSnapshotSavedAt: null,
    draftItems: [],
    quotaTotalBytes: null,
    quotaUsageBytes: null,
  });
  const [mobileFocusStream, setMobileFocusStream] = useState<'ai' | 'google' | 'original'>('ai');
  const [qcFilter, setQcFilter] = useState<'all' | 'issues' | 'high-cps' | 'overlaps' | 'untranslated'>('all');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [lastExportNotice, setLastExportNotice] = useState<LastExportNotice | null>(null);
  const [isAndroidSetupModalOpen, setIsAndroidSetupModalOpen] = useState(false);
  const [androidSetupStatus, setAndroidSetupStatus] = useState<{
    needsRuntimePrompt: boolean;
    folderName: string | null;
    sdkInt: number | null;
  }>({ needsRuntimePrompt: false, folderName: null, sdkInt: null });
  const lastBackPressRef = useRef<number>(0);

  // Shared Yes/No Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Floating Field Actions & Column Stream Undo/Redo Popups
  const [fieldActionMenu, setFieldActionMenu] = useState<{
    index: number;
    field: WorkspaceStreamField;
    x: number;
    y: number;
  } | null>(null);
  const [columnHistoryMenu, setColumnHistoryMenu] = useState<{
    field: WorkspaceStreamField;
    x: number;
    y: number;
  } | null>(null);
  const [editTriggerTarget, setEditTriggerTarget] = useState<{
    index: number;
    field: WorkspaceStreamField;
    nonce: number;
  } | null>(null);
  const [editorFocusStream, setEditorFocusStream] = useState<WorkspaceStreamField | undefined>(undefined);

  // Per-block Undo / Redo history map (keyed by subtitle.index)
  const blockHistoryRef = useRef<
    Map<
      number,
      {
        stack: Array<{ text: string; translatedText?: string; googleTranslateText?: string }>;
        ptr: number;
      }
    >
  >(new Map());
  const [blockHistoryVersion, setBlockHistoryVersion] = useState(0);

  // Per-stream Undo / Redo history map ('orig' | 'ai' | 'google')
  const streamHistoryRef = useRef<Record<WorkspaceStreamField, { stack: string[][]; ptr: number }>>({
    orig: { stack: [], ptr: -1 },
    ai: { stack: [], ptr: -1 },
    google: { stack: [], ptr: -1 },
  });
  const isStreamHistoryNavigating = useRef(false);
  const [streamHistoryVersion, setStreamHistoryVersion] = useState(0);

  // Subtitle Editing Modes & Controls: Main page dashboard is read-only
  const [isReadOnly, setIsReadOnly] = useState<boolean>(() => loadAppPreferences().defaultReadOnly);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isConfirmingBatchDeleteWorkspace, setIsConfirmingBatchDeleteWorkspace] = useState(false);

  useEffect(() => {
    if (isConfirmingBatchDeleteWorkspace) {
      const timer = setTimeout(() => setIsConfirmingBatchDeleteWorkspace(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingBatchDeleteWorkspace]);

  // Dedicated Expanded Subtitle Editor Studio Modal
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editorFocusIndex, setEditorFocusIndex] = useState<number | undefined>(undefined);
  // Column display selection for Dedicated Editor Studio (default: all checked)
  const [studioColumnsToDisplay, setStudioColumnsToDisplay] = useState({
    original: true,
    ai: true,
    google: true,
    time: true
  });

  const handleOpenEditor = useCallback((index?: number, stream?: WorkspaceStreamField) => {
    setEditorFocusIndex(index);
    setEditorFocusStream(stream);
    setIsEditorModalOpen(true);
  }, []);

  // Undo / Redo History Stack (up to 50 snapshots)
  const [history, setHistory] = useState<SubtitleItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryNavigating = useRef(false);

  // Column Visibility Toggles
  const [visibleColumns, setVisibleColumns] = useState({
    time: true,
    original: true,
    ai: true,
    google: true
  });

  // Advanced Subtitle Editing Modals
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isTimeShiftOpen, setIsTimeShiftOpen] = useState(false);
  const [isGapTimingOpen, setIsGapTimingOpen] = useState(false);
  const [isTextCleanupOpen, setIsTextCleanupOpen] = useState(false);
  const [originalTimingMap, setOriginalTimingMap] = useState<OriginalTimingMap>({});

  // Adaptive Worker Scaling & Rate Limits
  const [adaptiveScalingEnabled, setAdaptiveScalingEnabled] = useState(true);
  const [activeAdaptiveInfo, setActiveAdaptiveInfo] = useState<{
    workers: number;
    delay: number;
    throttled: boolean;
    reason?: string;
  }>({ workers: 2, delay: 1200, throttled: false });

  // Pagination for high-speed rendering (prevents DOM layout recalculation lag)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => loadAppPreferences().defaultPageSize); // 25, 50, 100, 0 for all
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [theme, setTheme] = useState<AppTheme>(() => loadAppPreferences().theme);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const updatePreferences = useCallback((updater: (prev: AppPreferences) => AppPreferences) => {
    setPreferences(prev => updater(prev));
  }, []);

  const handleThemeChange = useCallback((nextTheme: AppTheme) => {
    setTheme(nextTheme);
    setPreferences(prev => ({ ...prev, theme: nextTheme }));
  }, []);

  useEffect(() => {
    applyPreferencesToDOM(preferences);
    saveAppPreferences(preferences);
    if (preferences.theme !== theme) {
      setTheme(preferences.theme);
    }
  }, [preferences, theme]);

  useEffect(() => {
    saveGlossary(glossary);
  }, [glossary]);

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'saved' | 'not-saved') => {
    const np = preferencesRef.current.notificationPrefs;
    if (!np.enabled && type !== 'error') return;
    if (type === 'warning' && !np.showWarnings) return;
    if ((type === 'saved' || type === 'not-saved') && !np.showSaveAlerts) return;

    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev.slice(-3), { id, message, type }]);
    const duration = Math.max(1500, Math.min(6000, np.durationMs || 3200));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  // Online & Offline connectivity tracking for Android & Web
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addNotification("Connected: Online translation active", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      addNotification("Offline Mode: Local editing & exports active", "warning");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addNotification]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev].slice(0, 50));

    if (type === 'success' || type === 'error' || type === 'warning') {
      addNotification(message, type);
    }
  }, [addNotification]);

  const applyFontSelection = useCallback((name: string, value: string) => {
    if (fontTarget === 'global') {
      setIsGlobalFontActive(true);
      setGlobalFont(value);
      setOriginalFont(value);
      setUrduFont(value);
      setGoogleFont(value);
      addLog(`Applied global font "${name}" to all subtitle streams.`, 'success');
      addNotification(`Global font applied: ${name}`, 'success');
    } else if (fontTarget === 'original') {
      setIsGlobalFontActive(false);
      setOriginalFont(value);
      addLog(`Applied font "${name}" to Original subtitles.`, 'info');
      addNotification(`Original stream font: ${name}`, 'success');
    } else if (fontTarget === 'ai') {
      setIsGlobalFontActive(false);
      setUrduFont(value);
      addLog(`Applied font "${name}" to AI Translation subtitles.`, 'info');
      addNotification(`AI Translation font: ${name}`, 'success');
    } else if (fontTarget === 'google') {
      setIsGlobalFontActive(false);
      setGoogleFont(value);
      addLog(`Applied font "${name}" to Google Translation subtitles.`, 'info');
      addNotification(`Google stream font: ${name}`, 'success');
    }
  }, [fontTarget, addLog, addNotification]);

  const applyFontSelectionDraft = useCallback((name: string, value: string) => {
    if (draftFontTarget === 'global') {
      setDraftIsGlobalFontActive(true);
      setDraftGlobalFont(value);
      setDraftOriginalFont(value);
      setDraftUrduFont(value);
      setDraftGoogleFont(value);
    } else if (draftFontTarget === 'original') {
      setDraftIsGlobalFontActive(false);
      setDraftOriginalFont(value);
    } else if (draftFontTarget === 'ai') {
      setDraftIsGlobalFontActive(false);
      setDraftUrduFont(value);
    } else if (draftFontTarget === 'google') {
      setDraftIsGlobalFontActive(false);
      setDraftGoogleFont(value);
    }
  }, [draftFontTarget]);

  const handleApplyTextResize = useCallback(() => {
    setOriginalFontSize(draftOriginalFontSize);
    setTranslatedFontSize(draftTranslatedFontSize);
    setGoogleFontSize(draftGoogleFontSize);
    setGlobalFontSize(draftGlobalFontSize);
    setIsTextResizeOpen(false);
    addLog(`Applied text sizing: Source (${draftOriginalFontSize}px), AI (${draftTranslatedFontSize}px), Google (${draftGoogleFontSize}px).`, 'success');
    addNotification('Workspace text sizes applied', 'success');
  }, [draftOriginalFontSize, draftTranslatedFontSize, draftGoogleFontSize, draftGlobalFontSize, addLog, addNotification]);

  const handleCancelTextResize = useCallback(() => {
    setDraftOriginalFontSize(originalFontSize);
    setDraftTranslatedFontSize(translatedFontSize);
    setDraftGoogleFontSize(googleFontSize);
    setDraftGlobalFontSize(globalFontSize);
    setIsTextResizeOpen(false);
  }, [originalFontSize, translatedFontSize, googleFontSize, globalFontSize]);

  const handleApplyFonts = useCallback(() => {
    setIsGlobalFontActive(draftIsGlobalFontActive);
    setGlobalFont(draftGlobalFont);
    setOriginalFont(draftOriginalFont);
    setUrduFont(draftUrduFont);
    setGoogleFont(draftGoogleFont);
    setFontTarget(draftFontTarget);
    setIsFontsOpen(false);
    addLog('Applied typography changes across subtitle streams.', 'success');
    addNotification('Workspace fonts applied', 'success');
  }, [draftIsGlobalFontActive, draftGlobalFont, draftOriginalFont, draftUrduFont, draftGoogleFont, draftFontTarget, addLog, addNotification]);

  const handleCancelFonts = useCallback(() => {
    setDraftOriginalFont(originalFont);
    setDraftUrduFont(urduFont);
    setDraftGoogleFont(googleFont);
    setDraftGlobalFont(globalFont);
    setDraftIsGlobalFontActive(isGlobalFontActive);
    setDraftFontTarget(fontTarget);
    setIsFontsOpen(false);
  }, [originalFont, urduFont, googleFont, globalFont, isGlobalFontActive, fontTarget]);

  const handleUploadFontFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFont(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\s]/g, ' ').trim() || 'CustomUploadedFont';
      const fontValue = await registerUploadedFont(fontName, arrayBuffer);
      const newFont: CustomFontItem = {
        id: `uploaded-${Date.now()}`,
        name: `${fontName} (Uploaded)`,
        value: fontValue,
        isUploaded: true
      };
      const updated = [newFont, ...localFonts];
      setLocalFonts(updated);
      saveLocalFontsToStorage(updated);
      if (isFontsOpen) {
        applyFontSelectionDraft(newFont.name, newFont.value);
      } else {
        applyFontSelection(newFont.name, newFont.value);
      }
      addLog(`Uploaded and loaded custom font: "${newFont.name}".`, 'success');
      addNotification(`Font loaded: ${newFont.name}`, 'success');
    } catch (err: any) {
      addLog(`Failed to load custom font file: ${err?.message || err}`, 'error');
      addNotification('Failed to load font file', 'error');
    } finally {
      setIsUploadingFont(false);
      if (e.target) e.target.value = '';
    }
  }, [localFonts, isFontsOpen, applyFontSelectionDraft, applyFontSelection, addLog, addNotification]);

  const handleAddNamedFont = useCallback(() => {
    if (!customFontInputName.trim()) {
      addNotification('Please enter a font family name', 'error');
      return;
    }
    const cleanName = customFontInputName.trim();
    const fontValue = `'${cleanName}', -apple-system, BlinkMacSystemFont, sans-serif`;
    const newFont: CustomFontItem = {
      id: `named-${Date.now()}`,
      name: cleanName,
      value: fontValue
    };
    const updated = [newFont, ...localFonts];
    setLocalFonts(updated);
    saveLocalFontsToStorage(updated);
    if (isFontsOpen) {
      applyFontSelectionDraft(cleanName, fontValue);
    } else {
      applyFontSelection(cleanName, fontValue);
    }
    setCustomFontInputName('');
    addLog(`Added custom/system font: "${cleanName}".`, 'success');
    addNotification(`Added font: ${cleanName}`, 'success');
  }, [customFontInputName, localFonts, isFontsOpen, applyFontSelectionDraft, applyFontSelection, addLog, addNotification]);

  const handleDeleteLocalFont = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = localFonts.filter(f => f.id !== id);
    setLocalFonts(updated);
    saveLocalFontsToStorage(updated);
    addNotification('Custom font removed', 'success');
  }, [localFonts, addNotification]);

  const resetStreamHistory = useCallback((items: SubtitleItem[]) => {
    streamHistoryRef.current = {
      orig: { stack: [items.map(s => s.text || '')], ptr: 0 },
      ai: { stack: [items.map(s => s.translatedText || '')], ptr: 0 },
      google: { stack: [items.map(s => s.googleTranslateText || '')], ptr: 0 },
    };
    setStreamHistoryVersion(v => v + 1);
  }, []);

  const geminiRef = useRef<GeminiService | null>(null);
  const stopGeminiRef = useRef(false);
  const stopGoogleRef = useRef(false);
  const geminiAbortControllerRef = useRef<AbortController | null>(null);
  const googleAbortControllerRef = useRef<AbortController | null>(null);

  const refreshDraftsAndStats = useCallback(async () => {
    try {
      const [loadedDrafts, breakdownData] = await Promise.all([
        dbService.listDrafts(),
        dbService.getDetailedStorageBreakdown(),
      ]);
      setDrafts(loadedDrafts);
      setStorageBreakdown(breakdownData);
    } catch (e) {
      console.error('Failed to refresh drafts/stats', e);
    }
  }, []);

  const buildDraftPayload = useCallback(
    (
      subs: SubtitleItem[],
      opts: {
        id?: string;
        title: string;
        fileName: string;
        detectedFormat: string;
        context: string;
        customPrompt: string;
        translationSettings: TranslationSettings;
        activeStylingConfig: ActiveStylingConfig;
      }
    ): ProjectDraft => {
      const totalCount = subs.length;
      const aiCount = subs.filter((s) => Boolean(s.translatedText?.trim())).length;
      const gCount = subs.filter((s) => Boolean(s.googleTranslateText?.trim())).length;
      const isCompleted = totalCount > 0 && (aiCount === totalCount || gCount === totalCount);

      const tags: string[] = [];
      if (isCompleted) tags.push('Completed');
      if (aiCount > 0) tags.push('AI');
      if (gCount > 0) tags.push('Neutral / Google');
      const hasBilingual = subs.some(
        (s) =>
          s.translatedText &&
          s.translatedText.includes('\n') &&
          /[a-zA-Z]/.test(s.translatedText) &&
          /[\u0600-\u06FF]/.test(s.translatedText)
      );
      if (
        hasBilingual ||
        opts.translationSettings.scriptMode?.startsWith('bilingual') ||
        (aiCount > 0 && gCount > 0)
      ) {
        tags.push('Bilingual');
      }
      if (subs.some((s) => /[\u0600-\u06FF]/.test(s.translatedText || s.googleTranslateText || ''))) {
        tags.push('Urdu');
      } else if (
        subs.some(
          (s) =>
            (s.translatedText || s.googleTranslateText) &&
            /[a-zA-Z]/.test(s.translatedText || s.googleTranslateText || '')
        )
      ) {
        tags.push('Roman');
      }
      const fmt = (opts.detectedFormat || 'SRT').split(' ')[0].replace(/[^a-zA-Z0-9.]/g, '');
      if (fmt && !tags.includes(fmt)) tags.push(fmt);

      return {
        id: opts.id || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: opts.title,
        fileName: opts.fileName || `${opts.title}.srt`,
        detectedFormat: opts.detectedFormat || 'SRT',
        sourceType: opts.detectedFormat.includes('Online')
          ? 'url'
          : opts.detectedFormat.includes('Demo')
          ? 'demo'
          : 'local',
        updatedAt: new Date().toISOString(),
        subtitleCount: totalCount,
        translatedCount: aiCount,
        googleCount: gCount,
        isCompleted,
        tags,
        subtitles: subs,
        context: opts.context,
        customPrompt: opts.customPrompt,
        translationSettings: opts.translationSettings,
        activeStylingConfig: opts.activeStylingConfig,
      };
    },
    []
  );

  const autoArchiveCurrentProject = useCallback(
    async (reason: 'load-new' | 'switch-draft' | 'discard') => {
      const currentSubs = subtitlesRef.current;
      if (!currentSubs || currentSubs.length === 0) return;

      const curFileName = fileNameRef.current;
      const curDetectedFormat = detectedFormatRef.current;
      const curContext = contextRef.current;
      const curCustomPrompt = customPromptRef.current;
      const curDraftId = activeDraftIdRef.current;

      // Skip auto-saving untouched built-in Demo sample
      if (
        curDetectedFormat.includes('Demo') &&
        !curDraftId &&
        currentSubs.length === DEMO_SAMPLE_SUBTITLES.length &&
        JSON.stringify(currentSubs) === JSON.stringify(DEMO_SAMPLE_SUBTITLES) &&
        !curContext
      ) {
        return;
      }

      const existingDraft = curDraftId
        ? draftsRef.current.find((d) => d.id === curDraftId)
        : undefined;

      const totalCount = currentSubs.length;
      const aiCount = currentSubs.filter((s) => Boolean(s.translatedText?.trim())).length;
      const gCount = currentSubs.filter((s) => Boolean(s.googleTranslateText?.trim())).length;
      const isCompleted = totalCount > 0 && (aiCount === totalCount || gCount === totalCount);

      const subsJson = JSON.stringify(currentSubs);
      if (
        existingDraft &&
        existingDraft.context === curContext &&
        existingDraft.customPrompt === curCustomPrompt &&
        Boolean(existingDraft.isCompleted) === isCompleted &&
        JSON.stringify(existingDraft.subtitles) === subsJson
      ) {
        return;
      }

      if (!existingDraft) {
        const duplicate = draftsRef.current.find(
          (d) =>
            d.fileName === curFileName &&
            d.subtitleCount === totalCount &&
            d.context === curContext &&
            d.customPrompt === curCustomPrompt &&
            Boolean(d.isCompleted) === isCompleted &&
            JSON.stringify(d.subtitles) === subsJson
        );
        if (duplicate) return;
      }

      const title = existingDraft?.title || curFileName || `Project ${new Date().toLocaleTimeString()}`;

      const draft = buildDraftPayload(currentSubs, {
        id: existingDraft?.id,
        title,
        fileName: curFileName || `${title}.srt`,
        detectedFormat: curDetectedFormat || 'SRT',
        context: curContext,
        customPrompt: curCustomPrompt,
        translationSettings: translationSettingsRef.current,
        activeStylingConfig: activeStylingConfigRef.current,
      });

      try {
        await dbService.saveDraft(draft);
        await refreshDraftsAndStats();
        if (isCompleted) {
          addLog(
            `Auto-saved completed translation "${title}" to Translated Subtitles (${reason}).`,
            'success'
          );
          addNotification(`Saved completed translation to Translated Subtitles: ${title}`, 'saved');
        } else {
          addLog(`Auto-saved progress "${title}" to Drafts (${reason}).`, 'info');
          addNotification(`Auto-saved progress to Drafts: ${title}`, 'saved');
        }
      } catch {
        addLog(`Failed to auto-save "${title}" before ${reason}.`, 'warning');
      }
    },
    [buildDraftPayload, refreshDraftsAndStats, addLog, addNotification]
  );

  const loadSampleSubtitles = useCallback(async () => {
    await autoArchiveCurrentProject('load-new');
    setSubtitles(DEMO_SAMPLE_SUBTITLES);
    historyRef.current = [DEMO_SAMPLE_SUBTITLES];
    historyIndexRef.current = 0;
    setHistory([DEMO_SAMPLE_SUBTITLES]);
    setHistoryIndex(0);
    blockHistoryRef.current.clear();
    setBlockHistoryVersion(v => v + 1);
    resetStreamHistory(DEMO_SAMPLE_SUBTITLES);
    setOriginalTimingMap(createOriginalTimingMap(DEMO_SAMPLE_SUBTITLES));
    setActiveDraftId(null);
    setHasAppliedCustomStyle(false);
    setIsWorkspaceStylingPreview(false);
    setFileName('cinematic_demo_subtitles.srt');
    setDetectedFormat('Demo Subtitles (.srt)');
    setQcFilter('all');
    setVisibleColumns(prev => ({ ...prev, original: true, ai: true, google: true }));
    dbService.clearCrashSnapshot().catch(() => {});
    setCrashSnapshot(null);
    setActiveTab('workspace');
    addLog('Loaded 4 cinematic demo subtitle segments with Original, AI Urdu, and Google translation streams.', 'success');
    addNotification('Loaded demo subtitle project', 'success');
  }, [autoArchiveCurrentProject, addLog, addNotification, resetStreamHistory]);

  // Persistence: Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const hasPrefsStored = Boolean(localStorage.getItem('urdu_dubber_app_prefs_v1'));
        const [saved, loadedDrafts, loadedCrash, breakdownData] = await Promise.all([
          dbService.loadState(),
          dbService.listDrafts().catch(() => []),
          dbService.loadCrashSnapshot().catch(() => null),
          dbService.getDetailedStorageBreakdown().catch(() => ({
            draftsCount: 0,
            subtitlesInActive: 0,
            logsCount: 0,
            estimatedBytes: 0,
            localStorageBytes: 0,
            activeProjectBytes: 0,
            crashSnapshotBytes: 0,
            crashSnapshotSavedAt: null,
            draftItems: [],
            quotaTotalBytes: null,
            quotaUsageBytes: null,
          })),
        ]);
        setDrafts(loadedDrafts);
        setStorageBreakdown(breakdownData);

        const normalizeModel = (m?: string) => {
          if (!m || m === 'gemini-3.8-flash' || m === 'gemini-flash-latest' || m === 'gemini-pro' || m.startsWith('gemini-1.5') || m.startsWith('gemini-2.0')) {
            return 'gemini-4-hydrogen';
          }
          return m;
        };

        if (loadedCrash && loadedCrash.subtitles && loadedCrash.subtitles.length > 0) {
          const savedSubs = saved?.subtitles || [];
          const sameLength = savedSubs.length === loadedCrash.subtitles.length;
          const sameFile = (saved?.fileName || 'Untitled Project') === (loadedCrash.fileName || 'Untitled Project');
          const firstSaved = savedSubs[0];
          const lastSaved = savedSubs[savedSubs.length - 1];
          const firstCrash = loadedCrash.subtitles[0];
          const lastCrash = loadedCrash.subtitles[loadedCrash.subtitles.length - 1];
          const matchesSavedCleanly =
            sameLength &&
            sameFile &&
            firstSaved?.text === firstCrash?.text &&
            firstSaved?.translatedText === firstCrash?.translatedText &&
            lastSaved?.text === lastCrash?.text &&
            lastSaved?.translatedText === lastCrash?.translatedText;

          if (!matchesSavedCleanly) {
            setCrashSnapshot(loadedCrash);
          } else {
            dbService.clearCrashSnapshot().catch(() => {});
          }
        }

        if (saved) {
          if (saved.subtitles) {
            setSubtitles(saved.subtitles);
            historyRef.current = [saved.subtitles];
            historyIndexRef.current = 0;
            setHistory([saved.subtitles]);
            setHistoryIndex(0);
            resetStreamHistory(saved.subtitles);
            setOriginalTimingMap(createOriginalTimingMap(saved.subtitles));
          }
          if (saved.activeDraftId !== undefined) setActiveDraftId(saved.activeDraftId ?? null);
          if (saved.context) setContext(saved.context);
          if (saved.customPrompt) setCustomPrompt(saved.customPrompt);
          if (saved.logs) setLogs(saved.logs);
          if (saved.fileName) setFileName(saved.fileName);
          if (saved.detectedFormat) setDetectedFormat(saved.detectedFormat);
          if (saved.selectedModel) setSelectedModel(normalizeModel(saved.selectedModel));
          if (saved.googleApiKey) setGoogleApiKey(saved.googleApiKey);
          if (saved.geminiBatchSize) setGeminiBatchSize(saved.geminiBatchSize);
          if (saved.googleBatchSize) setGoogleBatchSize(saved.googleBatchSize);
          if (saved.geminiWorkers) setGeminiWorkers(saved.geminiWorkers);
          if (saved.googleWorkers) setGoogleWorkers(saved.googleWorkers);
          if (saved.geminiDelay) setGeminiDelay(saved.geminiDelay);
          if (saved.translatedFontSize) setTranslatedFontSize(saved.translatedFontSize);
          if (saved.originalFontSize) setOriginalFontSize(saved.originalFontSize);
          if (saved.urduFont) setUrduFont(saved.urduFont);
          if (saved.originalFont) setOriginalFont(saved.originalFont);
          if ((saved as any).googleFontSize) setGoogleFontSize((saved as any).googleFontSize);
          if ((saved as any).googleFont) setGoogleFont((saved as any).googleFont);
          if ((saved as any).isGlobalFontActive !== undefined) setIsGlobalFontActive((saved as any).isGlobalFontActive);
          if ((saved as any).globalFont) setGlobalFont((saved as any).globalFont);
          if ((saved as any).globalFontSize) setGlobalFontSize((saved as any).globalFontSize);
          if (!hasPrefsStored && (saved as any).theme) {
            const savedTh = (saved as any).theme;
            const resolvedTheme: AppTheme = savedTh === 'light' ? 'classic' : savedTh === 'dark' ? 'cinematic' : (savedTh as AppTheme);
            setTheme(resolvedTheme);
            setPreferences(prev => ({ ...prev, theme: resolvedTheme }));
          }
          if ((saved as any).activeStylingConfig) {
            setActiveStylingConfig(prev => ({ ...prev, ...(saved as any).activeStylingConfig }));
          }
          const savedCustomFlag = Boolean((saved as any).hasAppliedCustomStyle);
          const hasAnyTaggedSubs = Boolean(
            saved.subtitles?.some((s: SubtitleItem) => hasFormatting(s.translatedText || s.text || ''))
          );
          setHasAppliedCustomStyle(savedCustomFlag);
          setIsWorkspaceStylingPreview(
            savedCustomFlag || (Boolean((saved as any).isWorkspaceStylingPreview) && hasAnyTaggedSubs)
          );
          if (!hasPrefsStored && (saved as any).isReadOnly !== undefined) {
            setIsReadOnly(Boolean((saved as any).isReadOnly));
          }
          if ((saved as any).studioColumnsToDisplay) {
            setStudioColumnsToDisplay(prev => ({ ...prev, ...(saved as any).studioColumnsToDisplay }));
          }
          if ((saved as any).fontTarget) {
            setFontTarget((saved as any).fontTarget);
          }
          if ((saved as any).fontsActiveTab) {
            setFontsActiveTab((saved as any).fontsActiveTab);
          }
          if (!hasPrefsStored && (saved as any).pageSize !== undefined) {
            setPageSize((saved as any).pageSize);
          }
          if (saved.visibleColumns) {
            setVisibleColumns({
              time: saved.visibleColumns.time !== undefined ? saved.visibleColumns.time : true,
              original: saved.visibleColumns.original !== undefined ? saved.visibleColumns.original : true,
              ai: saved.visibleColumns.ai !== undefined ? saved.visibleColumns.ai : true,
              google: saved.visibleColumns.google !== undefined ? saved.visibleColumns.google : true,
            });
          }
          if (saved.targetLanguage || saved.scriptMode || saved.translationSettings) {
            setTranslationSettings({
              ...DEFAULT_TRANSLATION_SETTINGS,
              ...(saved.translationSettings || {}),
              targetLanguage: saved.targetLanguage || saved.translationSettings?.targetLanguage || 'ur',
              sourceLanguage: saved.sourceLanguage || saved.translationSettings?.sourceLanguage || 'auto',
              scriptMode: (saved.scriptMode || saved.translationSettings?.scriptMode || 'urdu-script') as any,
              toneRegister: (saved.toneRegister || saved.translationSettings?.toneRegister || 'aam-bolchal') as any,
              honorificRegister: (saved.honorificRegister || saved.translationSettings?.honorificRegister || 'contextual') as any,
              loanWordMode: (saved.loanWordMode || saved.translationSettings?.loanWordMode || 'natural-blend') as any,
              idiomMode: (saved.idiomMode || saved.translationSettings?.idiomMode || 'cultural-adaptation') as any,
              lineBreakMode: (saved.lineBreakMode || saved.translationSettings?.lineBreakMode || 'smart-two-line') as any,
              contentFilter: (saved.contentFilter || saved.translationSettings?.contentFilter || 'faithful') as any,
              audioCueMode: (saved.audioCueMode || saved.translationSettings?.audioCueMode || 'translate') as any,
              numberFormatMode: (saved.numberFormatMode || saved.translationSettings?.numberFormatMode || 'western') as any,
              punctuationMode: (saved.punctuationMode || saved.translationSettings?.punctuationMode || 'urdu-punctuation') as any,
            });
          }
          if (saved.sessionId) {
            setSessionId(saved.sessionId);
          } else {
            setSessionId(`GCS-${Math.random().toString(36).substring(2, 15).toUpperCase()}`);
          }
          addLog("Data loaded from IndexedDB.", "success");
        } else {
          setSessionId(`GCS-${Math.random().toString(36).substring(2, 15).toUpperCase()}`);
        }
      } catch (e) {
        console.error("Failed to load state", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, [addLog]);

  // Persistence: Save (Debounced)
  useEffect(() => {
    if (!isLoaded) return;
    
    setSaveStatus('saving');
    const timeoutId = setTimeout(async () => {
      const state = { 
        subtitles, 
        context, 
        customPrompt, 
        logs, 
        fileName, 
        detectedFormat,
        selectedModel, 
        googleApiKey,
        geminiBatchSize,
        googleBatchSize,
        geminiWorkers,
        googleWorkers,
        geminiDelay,
        sessionId,
        translatedFontSize,
        originalFontSize,
        googleFontSize,
        urduFont,
        originalFont,
        googleFont,
        isGlobalFontActive,
        globalFont,
        globalFontSize,
        translationSettings,
        visibleColumns,
        theme,
        activeStylingConfig,
        isWorkspaceStylingPreview,
        hasAppliedCustomStyle,
        activeDraftId,
        isReadOnly,
        studioColumnsToDisplay,
        fontTarget,
        fontsActiveTab,
        pageSize,
        targetLanguage: translationSettings.targetLanguage,
        scriptMode: translationSettings.scriptMode,
        toneRegister: translationSettings.toneRegister,
        lineBreakMode: translationSettings.lineBreakMode,
        contentFilter: translationSettings.contentFilter,
        audioCueMode: translationSettings.audioCueMode
      };
      try {
        await dbService.saveState(state);
        setSaveStatus('saved');
      } catch (e) {
        console.error("Failed to save state", e);
        setSaveStatus('saved');
        addNotification("Project auto-save failed — check storage space", "not-saved");
      }
    }, 1000); // Save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [
    isLoaded, 
    subtitles, 
    context, 
    customPrompt, 
    logs, 
    fileName, 
    detectedFormat,
    selectedModel, 
    googleApiKey, 
    geminiBatchSize, 
    googleBatchSize, 
    geminiWorkers, 
    googleWorkers, 
    geminiDelay, 
    translationSettings,
    translatedFontSize,
    originalFontSize,
    googleFontSize,
    urduFont,
    originalFont,
    googleFont,
    isGlobalFontActive,
    globalFont,
    globalFontSize,
    visibleColumns,
    theme,
    activeStylingConfig,
    isWorkspaceStylingPreview,
    hasAppliedCustomStyle,
    activeDraftId,
    isReadOnly,
    studioColumnsToDisplay,
    fontTarget,
    fontsActiveTab,
    pageSize
  ]);

  // Crash-Safe Live Recovery Auto-Save (throttled + pagehide/visibilitychange flush)
  const latestSnapshotRef = useRef<{
    subtitles: SubtitleItem[];
    fileName: string;
    detectedFormat: string;
    context: string;
    customPrompt: string;
  }>({ subtitles: [], fileName: '', detectedFormat: '', context: '', customPrompt: '' });

  latestSnapshotRef.current = { subtitles, fileName, detectedFormat, context, customPrompt };

  useEffect(() => {
    if (!isLoaded || !preferences.optionalFeatures.autoSaveDrafts || subtitles.length === 0) return;
    const timer = setTimeout(() => {
      dbService.saveCrashSnapshot({
        savedAt: new Date().toISOString(),
        fileName: fileName || 'Untitled Project',
        detectedFormat,
        subtitles,
        context,
        customPrompt,
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [isLoaded, preferences.optionalFeatures.autoSaveDrafts, subtitles, fileName, detectedFormat, context, customPrompt]);

  useEffect(() => {
    const flushRecovery = () => {
      const cur = latestSnapshotRef.current;
      if (!preferences.optionalFeatures.autoSaveDrafts || cur.subtitles.length === 0) return;
      dbService.saveCrashSnapshot({
        savedAt: new Date().toISOString(),
        fileName: cur.fileName || 'Untitled Project',
        detectedFormat: cur.detectedFormat,
        subtitles: cur.subtitles,
        context: cur.context,
        customPrompt: cur.customPrompt,
      }).catch(() => {});
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushRecovery();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushRecovery);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushRecovery);
    };
  }, [preferences.optionalFeatures.autoSaveDrafts]);

  const connectGemini = useCallback(async (overrideModel?: string, overrideKey?: string) => {
    if (geminiConnectStatus === 'loading') return false;
    setGeminiConnectStatus('loading');
    try {
      const safeOverrideModel = typeof overrideModel === 'string' ? overrideModel : undefined;
      const effectiveModel = safeOverrideModel || selectedModel;
      if (safeOverrideModel && safeOverrideModel !== selectedModel) {
        setSelectedModel(safeOverrideModel);
      }
      const effectiveKey = typeof overrideKey === 'string' ? overrideKey.trim() : getStoredGeminiApiKey();

      const status = await GeminiService.checkServerStatus(effectiveKey);
      if (!status.connected) {
        setError(status.error || "Gemini server is unavailable. Check GEMINI_API_KEY in Settings > Secrets.");
        setIsGeminiConnected(false);
        setGeminiConnectStatus('failed');
        setTimeout(() => setGeminiConnectStatus('idle'), 3000);
        return false;
      }
      geminiRef.current = new GeminiService(effectiveModel, effectiveKey);
      setIsGeminiConnected(true);
      setGeminiConnectStatus('success');
      addLog(
        `Gemini Connected (${status.mode === 'direct' ? 'local key' : 'server'}): ${effectiveModel}`,
        "success"
      );
      setError(null);
      setTimeout(() => setGeminiConnectStatus('idle'), 3000);
      return true;
    } catch (e: any) {
      const errMsg = `Failed to connect to Gemini server: ${e?.message || 'Unknown error'}`;
      setError(errMsg);
      setIsGeminiConnected(false);
      setGeminiConnectStatus('failed');
      setTimeout(() => setGeminiConnectStatus('idle'), 3000);
      return false;
    }
  }, [geminiConnectStatus, selectedModel, addLog]);

  const handleApplyGeminiApiKey = useCallback(async (rawKey?: string) => {
    const trimmed = (rawKey !== undefined ? rawKey : geminiApiKey).trim();
    setGeminiApiKey(trimmed);
    if (trimmed) {
      setStoredGeminiApiKey(trimmed);
    } else {
      clearStoredGeminiApiKey();
    }
    if (geminiRef.current) {
      geminiRef.current.updateConfig(selectedModel, trimmed);
    }
    const ok = await connectGemini(selectedModel, trimmed);
    if (ok) {
      addNotification(trimmed ? 'Gemini API key verified & active!' : 'Switched to Gemini server proxy', 'success');
    } else {
      addNotification('Gemini connection failed — check key or network', 'error');
    }
  }, [geminiApiKey, selectedModel, connectGemini, addNotification]);

  useEffect(() => {
    let cancelled = false;
    GeminiService.checkServerStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.connected) {
          if (!geminiRef.current) {
            geminiRef.current = new GeminiService(selectedModel);
          }
          setIsGeminiConnected(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (geminiRef.current) {
      geminiRef.current.updateConfig(selectedModel);
    }
  }, [selectedModel]);

  const ensureGeminiConnected = async () => {
    if (geminiRef.current && isGeminiConnected) {
      geminiRef.current.updateConfig(selectedModel);
      return true;
    }
    return await connectGemini();
  };

  const updateGeminiConfig = (newModel?: string) => {
    const modelToUse = newModel || selectedModel;
    if (!geminiRef.current) {
      void connectGemini(modelToUse);
      return;
    }
    try {
      geminiRef.current.updateConfig(modelToUse);
      addLog(`Gemini config updated: ${modelToUse}`, "success");
      setError(null);
    } catch (e) {
      setError("Failed to update Gemini configuration.");
    }
  };

  const updateGoogleConfig = async (overrideKey?: string) => {
    setGoogleConnectStatus('loading');
    const safeOverrideKey = typeof overrideKey === 'string' ? overrideKey : undefined;
    const keyToTest = (safeOverrideKey !== undefined ? safeOverrideKey : googleApiKey)?.trim() || '';
    if (safeOverrideKey !== undefined && safeOverrideKey.trim() !== googleApiKey) {
      setGoogleApiKey(safeOverrideKey.trim());
    }
    try {
      const probe = await translateTextGoogle(
        'Hello',
        keyToTest || undefined,
        undefined,
        translationSettingsRef.current,
        preferencesRef.current.googleRoutingMode
      );
      if (probe && probe !== 'Translation Error') {
        addLog(keyToTest ? 'Google Cloud Translate API key verified & active.' : 'Free Google Translate endpoint verified & active.', 'success');
        addNotification(keyToTest ? 'Google Cloud key verified!' : 'Free Google Translate endpoint active!', 'success');
        setGoogleConnectStatus('success');
      } else {
        throw new Error('Unexpected response from translation endpoint.');
      }
    } catch (err: any) {
      addLog(`Google Translate check failed: ${err?.message || err}`, 'error');
      addNotification(`Google verify failed: ${err?.message || 'Check key or connection'}`, 'error');
      setGoogleConnectStatus('failed');
    } finally {
      setTimeout(() => setGoogleConnectStatus('idle'), 3000);
    }
  };

  const stats = useMemo(() => {
    const total = subtitles.length;
    const translated = subtitles.filter(s => s.translatedText).length;
    const google = subtitles.filter(s => s.googleTranslateText).length;
    const progress = total > 0 ? Math.round((translated / total) * 100) : 0;
    const googleProgress = total > 0 ? Math.round((google / total) * 100) : 0;
    return { total, translated, google, progress, googleProgress };
  }, [subtitles]);

  const hasAnySubtitlesInApp = subtitles.length > 0 || drafts.length > 0;

  // Ref mirrors for atomic Undo/Redo history updates
  const historyRef = useRef<SubtitleItem[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Record per-stream changes cleanly (skipping no-ops)
  const recordStreamChanges = useCallback((prevSubs: SubtitleItem[], nextSubs: SubtitleItem[]) => {
    if (isStreamHistoryNavigating.current) return;
    let changedAny = false;
    const fields: WorkspaceStreamField[] = ['orig', 'ai', 'google'];
    const extract = (arr: SubtitleItem[], f: WorkspaceStreamField) =>
      arr.map(s => (f === 'orig' ? (s.text || '') : f === 'ai' ? (s.translatedText || '') : (s.googleTranslateText || '')));

    for (const f of fields) {
      const prevArr = extract(prevSubs, f);
      const nextArr = extract(nextSubs, f);
      const changed =
        prevArr.length !== nextArr.length || prevArr.some((val, idx) => val !== nextArr[idx]);
      if (!changed) continue;
      changedAny = true;
      const entry = streamHistoryRef.current[f];
      if (entry.stack.length === 0 || entry.ptr < 0) {
        entry.stack = [prevArr, nextArr];
        entry.ptr = 1;
      } else {
        const sliced = entry.stack.slice(0, entry.ptr + 1);
        sliced.push(nextArr);
        if (sliced.length > 40) sliced.shift();
        entry.stack = sliced;
        entry.ptr = sliced.length - 1;
      }
    }
    if (changedAny) {
      setStreamHistoryVersion(v => v + 1);
    }
  }, []);

  // Centralized subtitle state updater that records Undo/Redo history atomically
  const updateSubtitles = useCallback((newSubsOrUpdater: SubtitleItem[] | ((prev: SubtitleItem[]) => SubtitleItem[])) => {
    const prev = subtitlesRef.current;
    const nextSubs = typeof newSubsOrUpdater === 'function' ? newSubsOrUpdater(prev) : newSubsOrUpdater;
    subtitlesRef.current = nextSubs;
    setSubtitles(nextSubs);

    if (!isHistoryNavigating.current) {
      const sliced = historyRef.current.slice(0, historyIndexRef.current + 1);
      const nextHistory = [...sliced, nextSubs];
      if (nextHistory.length > 50) nextHistory.shift();
      historyRef.current = nextHistory;
      historyIndexRef.current = nextHistory.length - 1;
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      recordStreamChanges(prev, nextSubs);
    }
  }, [recordStreamChanges]);

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isHistoryNavigating.current = true;
      const nextIdx = historyIndexRef.current - 1;
      const targetState = historyRef.current[nextIdx];
      historyIndexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      setSubtitles(targetState);
      addNotification("Undo applied", "success");
      setTimeout(() => { isHistoryNavigating.current = false; }, 50);
    }
  }, [addNotification]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isHistoryNavigating.current = true;
      const nextIdx = historyIndexRef.current + 1;
      const targetState = historyRef.current[nextIdx];
      historyIndexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      setSubtitles(targetState);
      addNotification("Redo applied", "success");
      setTimeout(() => { isHistoryNavigating.current = false; }, 50);
    }
  }, [addNotification]);

  // Synchronize baseline original timing map whenever subtitles are loaded or imported
  useEffect(() => {
    if (subtitles.length > 0 && Object.keys(originalTimingMap).length === 0) {
      setOriginalTimingMap(createOriginalTimingMap(subtitles));
    }
  }, [subtitles, originalTimingMap]);

  // Reset Subtitle Timestamps back to original baseline at any time
  const handleResetTimingsToOriginal = useCallback(() => {
    if (Object.keys(originalTimingMap).length === 0) {
      addNotification("No previous timing changes to reset.", "success");
      return;
    }
    const { updatedSubtitles, resetCount } = resetSubtitleTimings(subtitles, originalTimingMap);
    if (resetCount === 0) {
      addNotification("All subtitles are already at original baseline timestamps.", "success");
      return;
    }
    updateSubtitles(updatedSubtitles);
    addNotification(`Restored ${resetCount} subtitle timestamps back to original baseline!`, "success");
    addLog(`Reset ${resetCount} subtitle blocks back to original timestamps.`, "success");
  }, [originalTimingMap, subtitles, updateSubtitles, addNotification, addLog]);

  // Subtitle Quality Control (QC) Inspector Map
  const qcAnalysis = useMemo(() => {
    const map = new Map<number, SubtitleQcIssue>();
    let highCpsCount = 0;
    let overlapCount = 0;
    let untranslatedCount = 0;
    let totalIssues = 0;

    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      const { durationSec, cps } = calculateDurationAndCPS(sub.translatedText || sub.text, sub.startTime, sub.endTime);
      const highCps = cps > 25;
      const shortDuration = durationSec > 0 && durationSec < 0.7;
      const emptyTranslation = !sub.translatedText || sub.translatedText.trim().length === 0;
      let overlapWithNext = false;
      if (i < subtitles.length - 1) {
        const endMs = timeStringToMs(sub.endTime);
        const nextStartMs = timeStringToMs(subtitles[i + 1].startTime);
        if (endMs > nextStartMs) overlapWithNext = true;
      }

      if (highCps) highCpsCount++;
      if (overlapWithNext) overlapCount++;
      if (emptyTranslation) untranslatedCount++;
      if (highCps || overlapWithNext || shortDuration || emptyTranslation) totalIssues++;

      map.set(sub.index, {
        highCps,
        emptyTranslation,
        overlapWithNext,
        shortDuration,
        cps,
        durationSec,
      });
    }
    return { map, highCpsCount, overlapCount, untranslatedCount, totalIssues };
  }, [subtitles]);

  // Search filtering & QC filtering & pagination
  const filteredSubtitles = useMemo(() => {
    let base = subtitles;
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      base = base.filter(s =>
        s.text.toLowerCase().includes(lowSearch) ||
        (s.translatedText && s.translatedText.toLowerCase().includes(lowSearch)) ||
        (s.googleTranslateText && s.googleTranslateText.toLowerCase().includes(lowSearch))
      );
    }
    if (preferences.optionalFeatures.enableQcInspector && qcFilter !== 'all') {
      base = base.filter(s => {
        const qc = qcAnalysis.map.get(s.index);
        if (!qc) return false;
        if (qcFilter === 'issues') return qc.highCps || qc.overlapWithNext || qc.shortDuration || qc.emptyTranslation;
        if (qcFilter === 'high-cps') return qc.highCps;
        if (qcFilter === 'overlaps') return qc.overlapWithNext;
        if (qcFilter === 'untranslated') return qc.emptyTranslation;
        return true;
      });
    }
    return base;
  }, [subtitles, searchTerm, preferences.optionalFeatures.enableQcInspector, qcFilter, qcAnalysis.map]);

  const totalPages = useMemo(() => {
    if (pageSize === 0) return 1;
    return Math.max(1, Math.ceil(filteredSubtitles.length / pageSize));
  }, [filteredSubtitles.length, pageSize]);

  const paginatedSubtitles = useMemo(() => {
    if (pageSize === 0) return filteredSubtitles;
    const start = (currentPage - 1) * pageSize;
    return filteredSubtitles.slice(start, start + pageSize);
  }, [filteredSubtitles, currentPage, pageSize]);

  // Progressive Viewport Rendering for Translation Workspace
  const progressiveWorkspaceSubtitles = useProgressiveRenderList(paginatedSubtitles, 15, 25);

  // Ensure current page is valid when list changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Selection & Bulk Action Handlers
  const toggleSelectRow = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIndices.size === filteredSubtitles.length && filteredSubtitles.length > 0) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(filteredSubtitles.map(s => s.index)));
    }
  }, [filteredSubtitles, selectedIndices.size]);

  const selectUntranslated = useCallback(() => {
    const untranslated = filteredSubtitles.filter(s => !s.translatedText || s.translatedText === 'Translation Error');
    if (untranslated.length === 0) {
      addNotification("All visible subtitles are already translated!", "success");
      return;
    }
    setSelectedIndices(new Set(untranslated.map(s => s.index)));
    addNotification(`Selected ${untranslated.length} untranslated subtitle(s)`, "success");
  }, [filteredSubtitles, addNotification]);

  const retrySelectedAI = async () => {
    if (selectedIndices.size === 0) return;
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    if (!(await ensureGeminiConnected())) return;
    
    const targetItems = subtitles.filter(s => selectedIndices.has(s.index));
    addLog(`Retrying AI translation for ${targetItems.length} selected subtitle(s)...`, "info");
    
    try {
      setIsTranslating(true);
      const effectiveCustomPrompt = preferences.optionalFeatures.enableTermGlossary
        ? `${customPrompt}${buildGlossaryInstruction(glossary)}`
        : customPrompt;
      const results = await geminiRef.current!.translateBatch(
        targetItems.map(item => ({ index: item.index, text: stripFormatting(item.text) })),
        context,
        effectiveCustomPrompt,
        undefined,
        translationSettings
      );
      
      if (results && results.length > 0) {
        const resultMap = new Map(results.map(r => [r.index, r.translatedText]));
        updateSubtitles(prev => prev.map(s => resultMap.has(s.index) ? { ...s, translatedText: resultMap.get(s.index) } : s));
        addLog(`Successfully re-translated ${results.length} subtitle(s).`, "success");
        addNotification(`Re-translated ${results.length} selected subtitle(s)`, "success");
      }
    } catch (err: any) {
      addLog(`Retry failed: ${err.message}`, "error");
      addNotification(`Retry failed: ${err.message}`, "error");
    } finally {
      setIsTranslating(false);
    }
  };

  const retrySelectedGoogle = async () => {
    if (selectedIndices.size === 0) return;
    const targetItems = subtitles.filter(s => selectedIndices.has(s.index));
    addLog(`Translating ${targetItems.length} selected subtitle(s) with Google/Machine...`, "info");
    
    try {
      setIsGoogleTranslatingAll(true);
      const results = await translateBatchGoogle(
        targetItems.map(item => ({ index: item.index, text: stripFormatting(item.text) })),
        googleApiKey,
        undefined,
        geminiRef.current || undefined,
        translationSettings,
        preferencesRef.current.googleRoutingMode
      );
      
      if (results && results.length > 0) {
        const resultMap = new Map(results.map(r => [r.index, r.googleTranslateText]));
        updateSubtitles(prev => prev.map(s => resultMap.has(s.index) ? { ...s, googleTranslateText: resultMap.get(s.index) } : s));
        addLog(`Google translated ${results.length} selected subtitle(s).`, "success");
        addNotification(`Google translated ${results.length} subtitle(s)`, "success");
      }
    } catch (err: any) {
      addLog(`Google retry failed: ${err.message}`, "error");
    } finally {
      setIsGoogleTranslatingAll(false);
    }
  };

  const retrySelectedBoth = async () => {
    if (selectedIndices.size === 0) return;
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    addLog(`Retrying both AI and Google translations for ${selectedIndices.size} selected subtitle(s)...`, "info");
    await Promise.all([retrySelectedAI(), retrySelectedGoogle()]);
  };

  const clearSelectedTranslations = useCallback(() => {
    if (selectedIndices.size === 0) return;
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    updateSubtitles(prev => prev.map(s => selectedIndices.has(s.index) ? { ...s, translatedText: '' } : s));
    addNotification(`Cleared AI translation on ${selectedIndices.size} subtitle(s) (timestamps & block numbers preserved)`, "success");
    addLog(`Cleared AI translation stream on ${selectedIndices.size} segment(s). Timestamps preserved.`, "info");
  }, [selectedIndices, isReadOnly, updateSubtitles, addNotification, addLog]);

  const clearSelectedGoogleTranslations = useCallback(() => {
    if (selectedIndices.size === 0) return;
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    updateSubtitles(prev => prev.map(s => selectedIndices.has(s.index) ? { ...s, googleTranslateText: '' } : s));
    addNotification(`Cleared Google translation on ${selectedIndices.size} subtitle(s) (timestamps & block numbers preserved)`, "success");
    addLog(`Cleared Google translation stream on ${selectedIndices.size} segment(s). Timestamps preserved.`, "info");
  }, [selectedIndices, isReadOnly, updateSubtitles, addNotification, addLog]);

  const clearSelectedBothTranslations = useCallback(() => {
    if (selectedIndices.size === 0) return;
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    updateSubtitles(prev => prev.map(s => selectedIndices.has(s.index) ? { ...s, translatedText: '', googleTranslateText: '' } : s));
    addNotification(`Cleared translation streams on ${selectedIndices.size} subtitle(s) (timestamps & block numbers preserved)`, "success");
    addLog(`Cleared both translation streams on ${selectedIndices.size} segment(s). Timestamps preserved.`, "info");
  }, [selectedIndices, isReadOnly, updateSubtitles, addNotification, addLog]);

  const clearSelectedOriginalStream = useCallback(() => {
    if (selectedIndices.size === 0) return;
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    updateSubtitles(prev => prev.map(s => selectedIndices.has(s.index) ? { ...s, text: '' } : s));
    addNotification(`Cleared original text stream on ${selectedIndices.size} subtitle(s) (timestamps & block numbers preserved)`, "success");
    addLog(`Cleared original dialogue stream on ${selectedIndices.size} segment(s). Timestamps preserved.`, "info");
  }, [selectedIndices, isReadOnly, updateSubtitles, addNotification, addLog]);

  const processSubtitleContent = async (fileTitle: string, content: string) => {
    addLog(`File selected: ${fileTitle}`, "info");
    void ensureGeminiConnected();

    const { items, detectedFormat: detectedFmt } = parseUniversalCaptions(content, fileTitle);
    if (items.length === 0) {
      addLog(`Could not parse subtitles from ${fileTitle}. File might be empty or invalid.`, "error");
      addNotification(`Failed to parse ${fileTitle}`, "error");
      return;
    }

    await autoArchiveCurrentProject('load-new');

    setFileName(fileTitle);
    setSubtitles(items);
    historyRef.current = [items];
    historyIndexRef.current = 0;
    setHistory([items]);
    setHistoryIndex(0);
    blockHistoryRef.current.clear();
    setBlockHistoryVersion(v => v + 1);
    resetStreamHistory(items);
    setOriginalTimingMap(createOriginalTimingMap(items));
    setActiveDraftId(null);
    setHasAppliedCustomStyle(false);
    setIsWorkspaceStylingPreview(false);
    setSelectedIndices(new Set());
    setDetectedFormat(detectedFmt);
    setQcFilter('all');
    dbService.clearCrashSnapshot().catch(() => {});
    setCrashSnapshot(null);
    setActiveTab('workspace');
    addLog(`Successfully loaded ${items.length} entries from ${detectedFmt}.`, "success");
    addNotification(`Loaded ${items.length} segments (${detectedFmt})`, "success");
  };

  const processSubtitleContentRef = useRef(processSubtitleContent);
  processSubtitleContentRef.current = processSubtitleContent;

  const processSubtitleFile = async (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = String(event.target?.result || '');
      await processSubtitleContent(selectedFile.name, content);
    };
    reader.readAsText(selectedFile);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      void processSubtitleFile(selectedFile);
    }
    e.target.value = '';
  };

  const analyzeSubtitles = async (): Promise<string | null> => {
    if (!(await ensureGeminiConnected())) {
      addLog("Please connect Gemini first.", "warning");
      addNotification("Gemini server not connected.", "error");
      return null;
    }
    if (subtitles.length === 0) {
      addLog("No subtitles to analyze.", "warning");
      addNotification("Load a subtitle file before analyzing.", "warning");
      return null;
    }
    const sample = subtitles
      .slice(0, 100)
      .map(s => stripFormatting(s.text || ''))
      .filter(Boolean)
      .join('\n');
    if (!sample.trim()) {
      addLog("No readable subtitle dialogue found to analyze.", "warning");
      addNotification("No subtitle dialogue text found to analyze.", "warning");
      return null;
    }

    setIsGeneratingContext(true);
    setAnalyzeStatus('loading');
    addLog("Analyzing subtitles for cultural context...", "info");
    try {
      const generatedContext = (await geminiRef.current.generateContext(sample)).trim();
      if (!generatedContext || generatedContext === "No context generated.") {
        throw new Error("No context text generated.");
      }
      setContext(generatedContext);
      addLog("Context analysis complete.", "success");
      setAnalyzeStatus('success');
      setTimeout(() => setAnalyzeStatus('idle'), 3000);
      return generatedContext;
    } catch (err: any) {
      const msg = err?.message || "Context analysis failed";
      addLog(`Analysis failed: ${msg}`, "error");
      addNotification(`Analysis failed: ${msg}`, "error");
      setAnalyzeStatus('failed');
      setTimeout(() => setAnalyzeStatus('idle'), 3000);
      return null;
    } finally {
      setIsGeneratingContext(false);
    }
  };

  const startTranslation = async () => {
    if (!(await ensureGeminiConnected())) {
      addLog("Please connect Gemini first.", "warning");
      return;
    }
    if (isTranslating) return;

    // Pre-execution Feasibility Check (non-blocking warning instead of window.confirm)
    const feasibility = quotaManager.analyzeFeasibility(
      subtitles, 
      geminiBatchSize, 
      Boolean(context && context.length > 50)
    );
    if (!feasibility.isFeasible && feasibility.status === 'insufficient') {
      addLog(
        `Quota Warning: File needs ~${feasibility.estimatedRequests} requests; ~${feasibility.remainingDailyRequests} estimated remaining today.`,
        "warning"
      );
      addNotification(`Quota tight (~${feasibility.remainingDailyRequests} left today). Running with safety throttle.`, "error");
    }

    // Enforce context analysis using return value (avoid React stale closure)
    let activeContext = context;
    if (!activeContext || activeContext.length < 50) {
      addLog("Context analysis required before translation. Analyzing now...", "warning");
      const analyzed = await analyzeSubtitles();
      if (!analyzed || analyzed.length < 20) {
        addLog("Context analysis failed. Please provide context manually or try again.", "error");
        return;
      }
      activeContext = analyzed;
    }

    const subsBeforeTranslation = subtitlesRef.current;
    setIsTranslating(true);
    stopGeminiRef.current = false;
    geminiAbortControllerRef.current = new AbortController();
    const abortSignal = geminiAbortControllerRef.current.signal;
    addLog("Starting Gemini translation...", "info");

    const itemsToTranslate = subtitles.filter(s => !s.translatedText);
    if (itemsToTranslate.length === 0) {
      addLog("All items are already translated.", "success");
      setIsTranslating(false);
      return;
    }

    // Parallel Gemini Engine
    const workerCount = geminiWorkers;
    const queue = [...itemsToTranslate];
    const BATCH_SIZE = geminiBatchSize;
    const effectiveCustomPrompt = preferences.optionalFeatures.enableTermGlossary
      ? `${customPrompt}${buildGlossaryInstruction(glossary)}`
      : customPrompt;

    const initialWorkerStates: Record<string, any> = {};
    for (let i = 0; i < workerCount; i++) {
      initialWorkerStates[`gemini-worker-${i}`] = { id: i, status: 'idle' };
    }
    setWorkerStates(prev => ({ ...prev, ...initialWorkerStates }));

    const startTime = Date.now();
    let totalCompleted = 0;
    const batchRetryCounts = new Map<number, number>();
    const MAX_BATCH_RETRIES = 2;

    const workers = Array(workerCount).fill(null).map(async (_, i) => {
      const workerId = `gemini-worker-${i}`;
      setWorkerStates(prev => ({ ...prev, [workerId]: { ...prev[workerId], status: 'working' } }));

      while (queue.length > 0 && !stopGeminiRef.current && !abortSignal.aborted) {
        // Adaptive Worker Scaling: check dynamically before starting next batch
        let effectiveDelay = geminiDelay;
        if (adaptiveScalingEnabled) {
          const adaptive = quotaManager.getAdaptiveScaling(geminiWorkers, geminiDelay);
          setActiveAdaptiveInfo({
            workers: adaptive.recommendedWorkers,
            delay: adaptive.recommendedDelay,
            throttled: adaptive.isThrottling,
            reason: adaptive.reason
          });
          effectiveDelay = adaptive.recommendedDelay;

          // If adaptive throttling recommends reducing concurrency, pause higher-index workers
          if (adaptive.isThrottling && i >= adaptive.recommendedWorkers) {
            setWorkerStates(prev => ({ ...prev, [workerId]: { ...prev[workerId], status: 'idle', currentItem: undefined } }));
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
        }

        const batch: any[] = [];
        for (let j = 0; j < BATCH_SIZE && queue.length > 0; j++) {
          const item = queue.shift();
          if (item) batch.push(item);
        }
        if (batch.length === 0) break;

        const batchKey = batch[0].index;
        setWorkerStates(prev => ({ ...prev, [workerId]: { ...prev[workerId], currentItem: batchKey, status: 'working' } }));

        try {
          addLog(`Worker ${i} translating batch starting at #${batchKey}...`, "info");
          const results = await geminiRef.current!.translateBatch(
            batch.map(b => ({ index: b.index, text: stripFormatting(b.text) })), 
            activeContext, 
            effectiveCustomPrompt,
            abortSignal,
            translationSettings
          );
          
          if (stopGeminiRef.current || abortSignal.aborted) break;

          if (!results || results.length === 0) {
            const tries = (batchRetryCounts.get(batchKey) || 0) + 1;
            batchRetryCounts.set(batchKey, tries);
            if (tries <= MAX_BATCH_RETRIES) {
              addLog(`Worker ${i} received empty results for batch #${batchKey}. Retry ${tries}/${MAX_BATCH_RETRIES}...`, "warning");
              queue.push(...batch);
              await new Promise(r => setTimeout(r, 1500));
            } else {
              addLog(`Batch starting at #${batchKey} skipped after ${MAX_BATCH_RETRIES} empty responses.`, "error");
            }
            continue;
          }

          totalCompleted += results.length;
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0) {
            setTranslationSpeed(Number((totalCompleted / elapsed).toFixed(1)));
          }

          // Force immediate state update for visibility
          setSubtitles(prev => {
            const next = [...prev];
            results.forEach(res => {
              const idx = next.findIndex(s => s.index === res.index);
              if (idx !== -1) {
                next[idx] = { ...next[idx], translatedText: res.translatedText };
              }
            });
            return next;
          });

          addLog(`Worker ${i} completed ${results.length} items. UI Updated.`, "success");

          if (queue.length > 0 && !stopGeminiRef.current && !abortSignal.aborted) {
            await new Promise(r => setTimeout(r, effectiveDelay));
          }
        } catch (err: any) {
          // If aborted by user, exit immediately without delay
          if (err?.name === 'AbortError' || stopGeminiRef.current || abortSignal.aborted) {
            break;
          }

          // HARD LIMIT AUTO-HALT on 429 Too Many Requests or Quota Limit
          const isRateLimit = err?.isRateLimit || /429|RESOURCE_EXHAUSTED|quota|rate limit|Too Many Requests|exceeded your current quota/i.test(err?.message || '');
          if (isRateLimit) {
            stopGeminiRef.current = true;
            if (geminiAbortControllerRef.current) {
              geminiAbortControllerRef.current.abort();
              geminiAbortControllerRef.current = null;
            }
            queue.length = 0;
            setIsTranslating(false);
            setTranslationSpeed(0);
            setWorkerStates(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(k => {
                if (k.startsWith('gemini-worker')) next[k] = { ...next[k], status: 'completed', currentItem: undefined };
              });
              return next;
            });
            setError("HARD LIMIT AUTO-HALT: API returned 429 Too Many Requests or Quota Limit Exceeded. All active workers halted immediately.");
            addLog("⚠️ HARD LIMIT AUTO-HALT: 429 / Quota Limit Exceeded. Translation stopped instantly.", "error");
            break;
          }

          // Halt immediately on fatal non-retryable server configuration/auth errors
          const isFatalConfigError = err?.statusCode === 503 || err?.statusCode === 401 || err?.statusCode === 403 || /GEMINI_API_KEY is not configured|API_KEY_INVALID/i.test(err?.message || '');
          if (isFatalConfigError) {
            stopGeminiRef.current = true;
            geminiAbortControllerRef.current?.abort();
            queue.length = 0;
            setError(err.message);
            addLog(`Translation stopped: ${err.message}`, "error");
            addNotification(err.message, "error");
            break;
          }

          const tries = (batchRetryCounts.get(batchKey) || 0) + 1;
          batchRetryCounts.set(batchKey, tries);
          addLog(`Worker ${i} error on #${batchKey} (attempt ${tries}/${MAX_BATCH_RETRIES + 1}): ${err.message}`, "error");
          if (!stopGeminiRef.current && !abortSignal.aborted && tries <= MAX_BATCH_RETRIES) {
            queue.push(...batch);
            await new Promise(r => setTimeout(r, 3000));
          } else {
            addNotification(`Batch #${batchKey} failed: ${err.message}`, "error");
          }
        }
      }
      setWorkerStates(prev => ({ ...prev, [workerId]: { ...prev[workerId], status: 'completed', currentItem: undefined } }));
    });

    await Promise.all(workers);
    setIsTranslating(false);
    setTranslationSpeed(0);
    geminiAbortControllerRef.current = null;
    setTimeout(() => recordStreamChanges(subsBeforeTranslation, subtitlesRef.current), 60);
    if (!stopGeminiRef.current && !abortSignal.aborted) addLog("Translation complete.", "success");
  };

  const stopTranslation = () => {
    stopGeminiRef.current = true;
    if (geminiAbortControllerRef.current) {
      geminiAbortControllerRef.current.abort();
      geminiAbortControllerRef.current = null;
    }
    setIsTranslating(false);
    setTranslationSpeed(0);
    setWorkerStates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith('gemini-worker')) next[k] = { ...next[k], status: 'idle', currentItem: undefined };
      });
      return next;
    });
    addLog("Gemini translation halted immediately.", "warning");
  };

  const requestStopTranslation = () => {
    const done = subtitlesRef.current.filter(s => Boolean(s.translatedText)).length;
    const total = subtitlesRef.current.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    setConfirmDialog({
      title: 'Pause / Stop AI Translation?',
      message: `AI dubbing is at ${pct}% (${done}/${total} blocks completed). Completed lines remain saved. Stop active AI workers now?`,
      confirmLabel: 'Stop AI',
      cancelLabel: 'Keep Running',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        stopTranslation();
      },
    });
  };

  const translateAllGoogle = async () => {
    if (isGoogleTranslatingAll) return;
    const subsBeforeGoogle = subtitlesRef.current;
    setIsGoogleTranslatingAll(true);
    stopGoogleRef.current = false;
    googleAbortControllerRef.current = new AbortController();
    const abortSignal = googleAbortControllerRef.current.signal;
    addLog("Starting Parallel Google Translate Engine...", "info");

    const itemsToTranslate = subtitles.filter(s => !s.googleTranslateText);
    if (itemsToTranslate.length === 0) {
      addLog("All items already have Google translations.", "success");
      setIsGoogleTranslatingAll(false);
      return;
    }

    // Parallel Engine Config: High-speed concurrency
    const totalBlocks = subtitles.length;
    const workerCount = googleWorkers;
    const BATCH_SIZE = googleBatchSize;
    
    addLog(`Turbo Engine initialized with ${workerCount} parallel workers (Batch Size: ${BATCH_SIZE}).`, "info");

    const queue = [...itemsToTranslate];
    let completedInBatch: typeof subtitles = [];
    const BATCH_UPDATE_INTERVAL = 1000; // Update UI every 1 second

    const initialWorkerStates: Record<string, any> = {};
    for (let i = 0; i < workerCount; i++) {
      initialWorkerStates[`google-worker-${i}`] = { id: i, status: 'idle' };
    }
    setWorkerStates(prev => ({ ...prev, ...initialWorkerStates }));

    const startTime = Date.now();
    let totalCompleted = 0;

    const updateUI = () => {
      if (completedInBatch.length === 0) return;
      const updates = [...completedInBatch];
      totalCompleted += updates.length;
      completedInBatch = [];
      
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > 0) {
        setTranslationSpeed(Number((totalCompleted / elapsed).toFixed(1)));
      }

      setSubtitles(prev => {
        const next = [...prev];
        updates.forEach(update => {
          const idx = next.findIndex(s => s.index === update.index);
          if (idx !== -1) {
            next[idx] = { ...next[idx], googleTranslateText: update.googleTranslateText };
          }
        });
        return next;
      });
    };

    const uiInterval = setInterval(updateUI, BATCH_UPDATE_INTERVAL);

    let warned403 = false;
    const workers = Array(workerCount).fill(null).map(async (_, i) => {
      const workerId = `google-worker-${i}`;
      setWorkerStates(prev => ({ ...prev, [workerId]: { ...prev[workerId], status: 'working' } }));

      while (queue.length > 0 && !stopGoogleRef.current && !abortSignal.aborted) {
        const batch: any[] = [];
        for (let j = 0; j < BATCH_SIZE && queue.length > 0; j++) {
          const item = queue.shift();
          if (item) batch.push(item);
        }

        if (batch.length === 0) break;

        setWorkerStates(prev => ({ 
          ...prev, 
          [workerId]: { 
            ...prev[workerId], 
            currentItem: batch[0].index,
            status: 'working'
          } 
        }));

        try {
          const results = await translateBatchGoogle(
            batch, 
            googleApiKey, 
            abortSignal, 
            geminiRef.current || undefined,
            translationSettings,
            preferencesRef.current.googleRoutingMode
          );
          if (stopGoogleRef.current || abortSignal.aborted) break;

          const has403 = results.some(r => r.error403);
          if (has403 && !warned403) {
            warned403 = true;
            addLog("⚠️ Google API returned 403 Forbidden. Switched seamlessly to Gemini Machine Translation Engine.", "warning");
          }

          const byIndex = new Map(results.map(r => [r.index, r.googleTranslateText]));
          completedInBatch.push(...batch.map((item, idx) => ({ 
            ...item, 
            googleTranslateText: byIndex.get(item.index) ?? results[idx]?.googleTranslateText ?? ''
          })));
        } catch (err: any) {
          if (err?.name === 'AbortError' || stopGoogleRef.current || abortSignal.aborted) {
            break;
          }
          console.error("Machine translation error:", err);
          if (geminiRef.current) {
            try {
              const fallback = await geminiRef.current.translateBatchNeutral(batch, undefined, abortSignal, translationSettings);
              const fbMap = new Map(fallback.map(r => [r.index, r.googleTranslateText]));
              completedInBatch.push(...batch.map((item, idx) => ({ ...item, googleTranslateText: fbMap.get(item.index) ?? fallback[idx]?.googleTranslateText ?? '' })));
              continue;
            } catch (fbErr) {
              console.error("Fallback failed", fbErr);
            }
          }
          completedInBatch.push(...batch.map(item => ({ ...item, googleTranslateText: "Translation unavailable" })));
        }
      }
      setWorkerStates(prev => ({ ...prev, [workerId]: { ...prev[workerId], status: 'completed', currentItem: undefined } }));
    });

    await Promise.all(workers);
    clearInterval(uiInterval);
    updateUI(); // Final update

    setIsGoogleTranslatingAll(false);
    setTranslationSpeed(0);
    googleAbortControllerRef.current = null;
    setTimeout(() => recordStreamChanges(subsBeforeGoogle, subtitlesRef.current), 60);
    if (!stopGoogleRef.current) {
      addLog("Parallel Google translation complete.", "success");
    } else {
      addLog("Parallel engine stopped immediately.", "warning");
    }
  };

  const translateSingleRowGoogle = useCallback(async (index: number) => {
    const item = subtitlesRef.current.find(s => s.index === index);
    if (!item) return;

    try {
      addLog(`Translating line #${index} with machine translator...`, "info");
      let translated = '';
      try {
        translated = await translateTextGoogle(
          item.text,
          googleApiKey,
          undefined,
          translationSettingsRef.current,
          preferencesRef.current.googleRoutingMode
        );
      } catch (err: any) {
        if (geminiRef.current) {
          translated = await geminiRef.current.getNeutralTranslation(item.text, undefined, translationSettingsRef.current);
          addLog(`Line #${index} translated with Gemini machine translator fallback.`, "info");
        } else {
          throw err;
        }
      }

      if (translated && translated !== "Translation Error") {
        setSubtitles(prev => prev.map(s => s.index === index ? { ...s, googleTranslateText: translated } : s));
        addLog(`Line #${index} machine comparison ready.`, "success");
      }
    } catch (e: any) {
      addLog(`Could not translate line #${index}: ${e.message}`, "error");
    }
  }, [googleApiKey, addLog]);

  const applyGoogleToAI = (index: number) => {
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    const item = subtitles.find(s => s.index === index);
    if (!item || !item.googleTranslateText) return;
    updateSubtitles(prev => prev.map(s => s.index === index ? { ...s, translatedText: item.googleTranslateText } : s));
    addLog(`Transferred Google translation to AI Urdu editor for segment #${index}.`, "info");
  };

  const copyAllGoogleToEmptyAI = () => {
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    let count = 0;
    updateSubtitles(prev => prev.map(s => {
      if (!s.translatedText && s.googleTranslateText && s.googleTranslateText !== 'Translation Error') {
        count++;
        return { ...s, translatedText: s.googleTranslateText };
      }
      return s;
    }));
    if (count > 0) {
      addLog(`Populated ${count} untranslated segments with Google translations.`, "success");
      addNotification(`Populated ${count} empty AI fields with Google translations`, "success");
    } else {
      addLog("All segments already have Urdu translations or no Google translations available.", "warning");
    }
  };

  const downloadFormattedSubtitles = async (
    format: 'srt-formatted' | 'ass' | 'ssa' | 'vtt' | 'srt-clean' | 'sbv' | 'lrc' | 'txt' | 'json' | 'copy',
    type: 'ai' | 'google' | 'original' = 'ai',
    folderTarget?: { directoryHandle?: any; dirName?: string }
  ) => {
    if (subtitles.length === 0) {
      addLog("Export failed: No subtitles to export.", "error");
      addNotification("No subtitles to export", "error");
      return;
    }

    try {
      const baseName = (fileName || 'subtitles').replace(/\.[^/.]+$/, '').replace(/[^a-z0-9_-]/gi, '_');
      let content = '';
      let mimeType = 'text/plain;charset=utf-8';
      let fileExt = 'srt';

      // One-tap Clipboard Copy for Android messaging / WhatsApp
      if (format === 'copy') {
        content = generateAndroidPhoneTranscript(subtitles, type, false);
        navigator.clipboard.writeText(content);
        addNotification("Subtitles copied to clipboard for Android / WhatsApp!", "success");
        addLog("Copied dialogue transcript to clipboard for mobile sharing.", "success");
        return;
      }

      if (format === 'srt-formatted') {
        content = generateFormattedSRT(subtitles, type);
        mimeType = 'text/srt;charset=utf-8';
        fileExt = `${type}_formatted.srt`;
      } else if (format === 'ass') {
        content = generateASS(subtitles, {
          fontFamily: urduFont,
          fontSize: translatedFontSize || 38,
          title: baseName,
          type,
          palette: GRADIENT_PALETTES.find(p => p.id === activeStylingConfig?.paletteId),
          stylingConfig: activeStylingConfig
        });
        mimeType = 'text/x-ssa;charset=utf-8';
        fileExt = `${type}_android_vlc.ass`;
      } else if (format === 'ssa') {
        content = generateSSA(subtitles, {
          fontFamily: urduFont,
          fontSize: translatedFontSize || 38,
          title: baseName,
          type,
          palette: GRADIENT_PALETTES.find(p => p.id === activeStylingConfig?.paletteId),
          stylingConfig: activeStylingConfig
        });
        mimeType = 'text/x-ssa;charset=utf-8';
        fileExt = `${type}_v4.ssa`;
      } else if (format === 'vtt') {
        content = generateWebVTT(subtitles, type);
        mimeType = 'text/vtt;charset=utf-8';
        fileExt = `${type}_web_android.vtt`;
      } else if (format === 'sbv') {
        content = generateYouTubeSBV(subtitles, type);
        mimeType = 'text/plain;charset=utf-8';
        fileExt = `${type}_youtube.sbv`;
      } else if (format === 'lrc') {
        content = generateLRC(subtitles, type);
        mimeType = 'text/plain;charset=utf-8';
        fileExt = `${type}_mobile_lyrics.lrc`;
      } else if (format === 'txt') {
        content = generateAndroidPhoneTranscript(subtitles, type, true);
        mimeType = 'text/plain;charset=utf-8';
        fileExt = `${type}_android_phone.txt`;
      } else if (format === 'json') {
        content = generateJSONCaptions(subtitles, type);
        mimeType = 'application/json;charset=utf-8';
        fileExt = `${type}_timed_text.json`;
      } else {
        content = generateCleanSRT(subtitles, type);
        mimeType = 'text/srt;charset=utf-8';
        fileExt = `${type}_clean.srt`;
      }

      if (!content || content.trim().length === 0) {
        addLog("Export failed: Generated file was empty.", "error");
        return;
      }

      const outFileName = `${baseName}_${fileExt}`;
      const blob = new Blob(['\ufeff' + content], { type: mimeType });

      // Direct export to user-selected folder when File System Access handle is provided
      if (folderTarget?.directoryHandle) {
        try {
          const dirHandle = folderTarget.directoryHandle;
          let perm = typeof dirHandle.queryPermission === 'function'
            ? await dirHandle.queryPermission({ mode: 'readwrite' })
            : 'granted';
          if (perm === 'prompt' && typeof dirHandle.requestPermission === 'function') {
            perm = await dirHandle.requestPermission({ mode: 'readwrite' });
          }
          if (perm === 'granted' && typeof dirHandle.getFileHandle === 'function') {
            const fileHandle = await dirHandle.getFileHandle(outFileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            const label = folderTarget.dirName || dirHandle.name || 'selected folder';
            addLog(`Exported ${outFileName} to folder "${label}".`, "success");
            addNotification(`Exported ${outFileName} to ${label}`, "success");
            return;
          }
        } catch (dirErr: any) {
          addLog(`Folder export unavailable (${dirErr?.message || 'permission denied'}), falling back to standard export.`, "warning");
        }
      }

      // Native Capacitor Android export (Selected SAF Folder / Documents/UrduLocalizer + FileProvider Share Sheet)
      if (isNativeAndroid()) {
        const res = await exportSubtitleNativeAndroid({
          fileName: outFileName,
          content,
          saveMode: preferencesRef.current.androidSaveMode || 'documents',
        });
        if (res.success) {
          const locationLabel = res.savedPath
            ? res.savedPath
            : 'Android Share / Save-As Sheet';
          setLastExportNotice({
            fileName: outFileName,
            locationLabel,
            shared: res.shared,
            onShareAgain: () => {
              void shareExportedAndroidSubtitle(outFileName, content);
            },
          });
          const msg = res.savedPath
            ? res.shared
              ? `Saved to ${res.savedPath} & opened Share sheet`
              : `Saved to ${res.savedPath}`
            : `Exported ${outFileName} via Android Share sheet`;
          addLog(msg, "success");
          addNotification(msg, "success");
        } else {
          const errMsg = res.error || "Android storage export failed — select an Export Folder or check permissions.";
          addLog(errMsg, "error");
          addNotification(errMsg, "error");
        }
        return;
      }

      // If on Android / Mobile and Web Share API is available, try native share sheet
      let sharedViaSystem = false;
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const testFile = new File([blob], outFileName, { type: 'text/plain' });
          if (navigator.canShare({ files: [testFile] })) {
            await navigator.share({
              files: [testFile],
              title: outFileName,
              text: `Subtitles exported from Urdu Localizer`
            });
            sharedViaSystem = true;
            addLog(`Shared ${outFileName} via Android system share sheet.`, "success");
            addNotification(`Shared ${format.toUpperCase()} subtitles`, "success");
          }
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            return;
          }
        }
      }

      if (!sharedViaSystem) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = outFileName;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 30000);

        addLog(`Exported ${format.toUpperCase()} subtitles: ${outFileName}`, "success");
        addNotification(`Exported ${format.toUpperCase()} format`, "success");
      }
    } catch (err: any) {
      console.error("Export failed:", err);
      addLog(`Export failed: ${err.message}`, "error");
    }
  };

  const stopGoogleTranslate = () => {
    stopGoogleRef.current = true;
    if (googleAbortControllerRef.current) {
      googleAbortControllerRef.current.abort();
      googleAbortControllerRef.current = null;
    }
    setIsGoogleTranslatingAll(false);
    setTranslationSpeed(0);
    setWorkerStates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith('google-worker')) next[k] = { ...next[k], status: 'idle', currentItem: undefined };
      });
      return next;
    });
    addLog("Google translation halted immediately.", "warning");
  };

  const requestStopGoogleTranslate = () => {
    const done = subtitlesRef.current.filter(s => Boolean(s.googleTranslateText)).length;
    const total = subtitlesRef.current.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    setConfirmDialog({
      title: 'Pause / Stop Neutral Translation?',
      message: `Neutral translation is at ${pct}% (${done}/${total} blocks completed). Completed lines remain saved. Stop active workers now?`,
      confirmLabel: 'Stop Neutral',
      cancelLabel: 'Keep Running',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        stopGoogleTranslate();
      },
    });
  };

  const downloadSRT = async (type: 'ai' | 'google' = 'ai') => {
    const subsToDownload = subtitles.map(s => ({
      ...s,
      translatedText: type === 'ai' ? s.translatedText : s.googleTranslateText
    }));
    const content = stringifySRT(subsToDownload);
    if (!content || content.trim().length === 0) {
      addLog("Download failed: No content to export.", "error");
      return;
    }
    
    try {
      // Use a unique timestamp to force the browser to treat this as a new download
      const timestamp = Date.now();
      const safeFileName = (fileName || 'subtitles.srt').replace(/[^a-z0-9.]/gi, '_');
      const finalFileName = `${type}_${timestamp}_${safeFileName}`;

      if (isNativeAndroid()) {
        const res = await exportSubtitleNativeAndroid({
          fileName: finalFileName,
          content,
          saveMode: preferencesRef.current.androidSaveMode || 'documents',
        });
        if (res.success) {
          addNotification(res.savedPath ? `Saved to ${res.savedPath}` : `Exported ${finalFileName}`, "success");
        } else {
          addNotification(res.error || "Android export failed", "error");
        }
        return;
      }

      // Use Blob with explicit UTF-8 BOM for better compatibility with some editors
      const blob = new Blob(['\ufeff' + content], { type: 'text/srt;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = finalFileName;
      
      // Add to DOM, click, and leave it for a bit
      document.body.appendChild(a);
      a.click();
      
      // Longer timeout before cleanup to ensure iframe doesn't kill the process
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 30000); // 30 seconds is safe
      
      addLog(`${type === 'ai' ? 'AI' : 'Google'} SRT download started: ${finalFileName}`, "success");
    } catch (err: any) {
      console.error("Download failed:", err);
      addLog(`Download failed: ${err.message}`, "error");
    }
  };

  const resetProject = async () => {
    // Auto-archive progress to Drafts (or Translated Subtitles if complete) before clearing active workspace
    try {
      await autoArchiveCurrentProject('discard');
      await Promise.all([dbService.clearState(), dbService.clearCrashSnapshot()]);
      setCrashSnapshot(null);
      setSubtitles([]);
      historyRef.current = [];
      historyIndexRef.current = -1;
      setHistory([]);
      setHistoryIndex(-1);
      blockHistoryRef.current.clear();
      setBlockHistoryVersion(v => v + 1);
      resetStreamHistory([]);
      setActiveDraftId(null);
      setContext('');
      setFileName('');
      setDetectedFormat('');
      setLogs([]);
      setError(null);
      setQcFilter('all');
      setSelectedIndices(new Set());
      setActiveStylingConfig(DEFAULT_STYLING_CONFIG);
      setHasAppliedCustomStyle(false);
      setIsWorkspaceStylingPreview(false);
      setIsReadOnly(preferences.defaultReadOnly);
      setStudioColumnsToDisplay({ original: true, ai: true, google: true, time: true });
      setVisibleColumns({ time: true, original: true, ai: true, google: true });
      setSessionId(`GCS-${Math.random().toString(36).substring(2, 15).toUpperCase()}`);
      setSaveStatus('saved');
      refreshDraftsAndStats();
      addLog("Active workspace cleared after saving progress.", "warning");
      addNotification("Workspace cleared", "success");
    } catch (e) {
      console.error("Failed to clear state", e);
      addLog("Failed to discard project.", "error");
    }
  };

  const handleLoadFromUrl = useCallback(async (url: string) => {
    try {
      let content = '';
      try {
        const response = await fetch(url, {
          signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        content = await response.text();
      } catch (directErr: any) {
        // Fallback to server-side proxy when remote server blocks browser CORS
        const proxyRes = await fetch('/api/fetch-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const proxyData = await proxyRes.json().catch(() => ({}));
        if (!proxyRes.ok || typeof proxyData?.content !== 'string') {
          throw new Error(proxyData?.error || directErr?.message || `HTTP ${proxyRes.status}`);
        }
        content = proxyData.content;
      }
      let derivedName = 'online_subtitles.srt';
      try {
        const parsedUrl = new URL(url);
        const tail = parsedUrl.pathname.split('/').filter(Boolean).pop();
        if (tail) derivedName = tail;
      } catch {}
      const { items, detectedFormat: detectedFmt } = parseUniversalCaptions(content, derivedName);
      if (items.length === 0) {
        throw new Error('Could not parse any valid subtitle segments from URL response.');
      }
      await autoArchiveCurrentProject('load-new');
      setSubtitles(items);
      historyRef.current = [items];
      historyIndexRef.current = 0;
      setHistory([items]);
      setHistoryIndex(0);
      blockHistoryRef.current.clear();
      setBlockHistoryVersion(v => v + 1);
      resetStreamHistory(items);
      setOriginalTimingMap(createOriginalTimingMap(items));
      setActiveDraftId(null);
      setHasAppliedCustomStyle(false);
      setIsWorkspaceStylingPreview(false);
      setSelectedIndices(new Set());
      setFileName(derivedName);
      setDetectedFormat(`${detectedFmt} (Online URL)`);
      setQcFilter('all');
      dbService.clearCrashSnapshot().catch(() => {});
      setCrashSnapshot(null);
      setActiveTab('workspace');
      addLog(`Loaded ${items.length} segments from URL: ${derivedName}`, 'success');
      addNotification(`Loaded ${items.length} online segments`, 'success');
    } catch (err: any) {
      const msg = err?.message?.includes('Failed to fetch')
        ? 'CORS blocked by remote server or offline. Try raw GitHub/CDN URL or local download.'
        : (err?.message || 'Failed to load URL');
      addLog(`Online URL import failed: ${msg}`, 'error');
      throw new Error(msg);
    }
  }, [autoArchiveCurrentProject, addLog, addNotification, resetStreamHistory]);

  const handleSaveCurrentAsDraft = useCallback(async (title: string) => {
    if (subtitles.length === 0) {
      addNotification('Load subtitles before saving a draft', 'error');
      return;
    }
    const cleanTitle = title.trim() || fileName || `Draft ${new Date().toLocaleTimeString()}`;
    const draft = buildDraftPayload(subtitles, {
      title: cleanTitle,
      fileName: fileName || `${cleanTitle}.srt`,
      detectedFormat: detectedFormat || 'SRT',
      context,
      customPrompt,
      translationSettings,
      activeStylingConfig,
    });
    try {
      await dbService.saveDraft(draft);
      setActiveDraftId(draft.id);
      await refreshDraftsAndStats();
      addLog(`Saved project draft "${cleanTitle}" (${subtitles.length} lines).`, 'success');
      addNotification(`Saved draft: ${cleanTitle}`, 'saved');
    } catch {
      addNotification(`Could not save draft "${cleanTitle}"`, 'not-saved');
    }
  }, [subtitles, fileName, detectedFormat, context, customPrompt, translationSettings, activeStylingConfig, buildDraftPayload, refreshDraftsAndStats, addLog, addNotification]);

  const handleLoadDraft = useCallback(async (draft: ProjectDraft) => {
    if (draft.id !== activeDraftIdRef.current) {
      await autoArchiveCurrentProject('switch-draft');
    }
    blockHistoryRef.current.clear();
    setBlockHistoryVersion(v => v + 1);
    setSubtitles(draft.subtitles);
    historyRef.current = [draft.subtitles];
    historyIndexRef.current = 0;
    setHistory([draft.subtitles]);
    setHistoryIndex(0);
    resetStreamHistory(draft.subtitles);
    setOriginalTimingMap(createOriginalTimingMap(draft.subtitles));
    setSelectedIndices(new Set());
    setActiveDraftId(draft.id);
    setFileName(draft.fileName);
    setDetectedFormat(draft.detectedFormat || 'Saved Draft');
    setContext(draft.context || '');
    setCustomPrompt(draft.customPrompt || '');
    if (draft.translationSettings) setTranslationSettings(draft.translationSettings);
    if (draft.activeStylingConfig) setActiveStylingConfig(draft.activeStylingConfig);
    const draftHasTags = Boolean(draft.subtitles?.some(s => hasFormatting(s.translatedText || s.text || '')));
    setHasAppliedCustomStyle(draftHasTags);
    setIsWorkspaceStylingPreview(draftHasTags);
    setQcFilter('all');
    dbService.clearCrashSnapshot().catch(() => {});
    setCrashSnapshot(null);
    setActiveTab('workspace');
    addLog(`Loaded draft "${draft.title}" (${draft.subtitleCount} lines).`, 'success');
    addNotification(`Opened draft: ${draft.title}`, 'success');
  }, [autoArchiveCurrentProject, addLog, addNotification, resetStreamHistory]);

  const handleDuplicateDraft = useCallback(async (draft: ProjectDraft) => {
    const copy: ProjectDraft = {
      ...draft,
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${draft.title} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    await dbService.saveDraft(copy);
    await refreshDraftsAndStats();
    addNotification('Draft duplicated', 'success');
  }, [refreshDraftsAndStats, addNotification]);

  const handleDeleteDraft = useCallback(async (id: string) => {
    await dbService.deleteDraft(id);
    setActiveDraftId(prev => (prev === id ? null : prev));
    await refreshDraftsAndStats();
    addNotification('Draft removed', 'success');
  }, [refreshDraftsAndStats, addNotification]);

  const handleRecoverCrash = useCallback(() => {
    if (!crashSnapshot) return;
    blockHistoryRef.current.clear();
    setBlockHistoryVersion(v => v + 1);
    setSubtitles(crashSnapshot.subtitles);
    historyRef.current = [crashSnapshot.subtitles];
    historyIndexRef.current = 0;
    setHistory([crashSnapshot.subtitles]);
    setHistoryIndex(0);
    resetStreamHistory(crashSnapshot.subtitles);
    setOriginalTimingMap(createOriginalTimingMap(crashSnapshot.subtitles));
    setActiveDraftId(null);
    setFileName(crashSnapshot.fileName || 'recovered_project.srt');
    setDetectedFormat(crashSnapshot.detectedFormat || 'Crash Recovery');
    setContext(crashSnapshot.context || '');
    setCustomPrompt(crashSnapshot.customPrompt || '');
    setQcFilter('all');
    dbService.clearCrashSnapshot().catch(() => {});
    setCrashSnapshot(null);
    setActiveTab('workspace');
    addLog(`Restored crash-recovery snapshot (${crashSnapshot.subtitles.length} lines).`, 'success');
    addNotification('Session restored from auto-save', 'success');
  }, [crashSnapshot, addLog, addNotification, resetStreamHistory]);

  const handleDismissCrash = useCallback(() => {
    dbService.clearCrashSnapshot().catch(() => {});
    setCrashSnapshot(null);
  }, []);

  const handleClearAllDrafts = useCallback(async () => {
    await dbService.clearAllDrafts();
    setActiveDraftId(null);
    await refreshDraftsAndStats();
    addLog('Cleared all saved drafts from IndexedDB.', 'warning');
    addNotification('All saved drafts cleared', 'success');
  }, [refreshDraftsAndStats, addLog, addNotification]);

  const handleResetPreferences = useCallback(() => {
    setPreferences(DEFAULT_APP_PREFERENCES);
    setTheme(DEFAULT_APP_PREFERENCES.theme);
    setPageSize(DEFAULT_APP_PREFERENCES.defaultPageSize);
    setIsReadOnly(DEFAULT_APP_PREFERENCES.defaultReadOnly);
    addNotification('All app preferences reset to defaults', 'success');
    addLog('App preferences reset to defaults.', 'info');
  }, [addNotification, addLog]);

  const handleExportBackup = useCallback(async () => {
    try {
      const allDrafts = await dbService.listDrafts();
      const backup: FullAppBackup = {
        version: 1,
        appName: 'Urdu Localizer',
        exportedAt: new Date().toISOString(),
        preferences,
        glossary,
        activeProject: {
          fileName,
          detectedFormat,
          subtitles,
          context,
          customPrompt,
          translationSettings,
          activeStylingConfig,
        },
        drafts: allDrafts,
      };
      const json = JSON.stringify(backup, null, 2);
      const outName = `urdu_localizer_backup_${new Date().toISOString().slice(0, 10)}.json`;

      if (isNativeAndroid()) {
        const res = await exportSubtitleNativeAndroid({
          fileName: outName,
          content: json,
          saveMode: preferencesRef.current.androidSaveMode || 'documents',
        });
        if (res.success) {
          addLog(`Exported full JSON backup: ${res.savedPath || outName}`, 'success');
          addNotification(res.savedPath ? `Backup saved to ${res.savedPath}` : 'Full JSON backup exported', 'success');
        } else {
          addNotification(res.error || 'Failed to export backup', 'error');
        }
        return;
      }

      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 15000);
      addLog(`Exported full JSON backup: ${outName}`, 'success');
      addNotification('Full JSON backup exported', 'success');
    } catch (err: any) {
      addLog(`Backup export failed: ${err?.message || err}`, 'error');
      addNotification('Failed to export backup', 'error');
    }
  }, [preferences, glossary, fileName, detectedFormat, subtitles, context, customPrompt, translationSettings, activeStylingConfig, addLog, addNotification]);

  const handleImportBackup = useCallback(async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Partial<FullAppBackup>;
      if (!parsed || typeof parsed !== 'object' || !parsed.preferences) {
        throw new Error('Invalid Urdu Localizer backup JSON format.');
      }
      const nextPrefs: AppPreferences = {
        ...DEFAULT_APP_PREFERENCES,
        ...parsed.preferences,
        uiZoom: clampZoom(Number(parsed.preferences.uiZoom ?? 100)),
        headerVisibility: { ...DEFAULT_APP_PREFERENCES.headerVisibility, ...(parsed.preferences.headerVisibility || {}) },
        menuVisibility: { ...DEFAULT_APP_PREFERENCES.menuVisibility, ...(parsed.preferences.menuVisibility || {}) },
        optionalFeatures: { ...DEFAULT_APP_PREFERENCES.optionalFeatures, ...(parsed.preferences.optionalFeatures || {}) },
      };
      setPreferences(nextPrefs);
      setTheme(nextPrefs.theme);
      setPageSize(nextPrefs.defaultPageSize);
      setIsReadOnly(nextPrefs.defaultReadOnly);
      if (Array.isArray(parsed.glossary)) setGlossary(parsed.glossary);
      if (Array.isArray(parsed.drafts)) {
        for (const d of parsed.drafts) {
          if (d?.id && Array.isArray(d?.subtitles)) {
            await dbService.saveDraft(d);
          }
        }
      }
      if (parsed.activeProject && Array.isArray(parsed.activeProject.subtitles) && parsed.activeProject.subtitles.length > 0) {
        await autoArchiveCurrentProject('load-new');
        setSubtitles(parsed.activeProject.subtitles);
        historyRef.current = [parsed.activeProject.subtitles];
        historyIndexRef.current = 0;
        setHistory([parsed.activeProject.subtitles]);
        setHistoryIndex(0);
        resetStreamHistory(parsed.activeProject.subtitles);
        setActiveDraftId(null);
        setOriginalTimingMap(createOriginalTimingMap(parsed.activeProject.subtitles));
        setFileName(parsed.activeProject.fileName || 'restored_project.srt');
        setDetectedFormat(parsed.activeProject.detectedFormat || 'Backup Restore');
        setContext(parsed.activeProject.context || '');
        setCustomPrompt(parsed.activeProject.customPrompt || '');
        if (parsed.activeProject.translationSettings) setTranslationSettings(parsed.activeProject.translationSettings);
        if (parsed.activeProject.activeStylingConfig) setActiveStylingConfig(parsed.activeProject.activeStylingConfig);
      }
      await refreshDraftsAndStats();
      addLog(`Imported full JSON backup from ${file.name}.`, 'success');
      addNotification('Backup restored successfully', 'success');
    } catch (err: any) {
      addLog(`Backup import failed: ${err?.message || err}`, 'error');
      addNotification(err?.message || 'Backup import failed', 'error');
    }
  }, [autoArchiveCurrentProject, refreshDraftsAndStats, addLog, addNotification, resetStreamHistory]);

  const handleBakeAllStyles = useCallback((silent = false) => {
    if (subtitles.length === 0) {
      setHasPendingStyleBake(false);
      return;
    }
    const styled = applyGradientsToSubtitles(
      subtitles,
      activeStylingConfig.paletteId,
      activeStylingConfig.gradientMode,
      activeStylingConfig.targetStreams,
      {
        customColors: activeStylingConfig.customColors,
        boldEmphasis: activeStylingConfig.boldEmphasis,
        italicize: activeStylingConfig.italicize,
        uppercaseOriginal: activeStylingConfig.transformCase === 'uppercase',
      }
    );
    updateSubtitles(styled);
    setHasAppliedCustomStyle(true);
    setIsWorkspaceStylingPreview(true);
    setHasPendingStyleBake(false);
    addNotification(
      silent ? 'Styles auto-baked onto subtitles' : 'Baked & applied all styles to subtitle project!',
      'saved'
    );
    addLog('Baked active styling configuration onto subtitles.', 'success');
  }, [subtitles, activeStylingConfig, updateSubtitles, addNotification, addLog]);

  // Auto-bake pending styling edits when exiting the Styling Studio tab
  const prevTabRef = useRef<MobileTab>(activeTab);
  useEffect(() => {
    const prevTab = prevTabRef.current;
    prevTabRef.current = activeTab;
    if (prevTab === 'styling' && activeTab !== 'styling' && hasPendingStyleBake) {
      handleBakeAllStyles(true);
    }
  }, [activeTab, hasPendingStyleBake, handleBakeAllStyles]);

  const handleDeleteDraftFromStorage = useCallback(async (id: string) => {
    await dbService.deleteDraft(id);
    setActiveDraftId(prev => (prev === id ? null : prev));
    await refreshDraftsAndStats();
    addNotification('Draft deleted from storage', 'success');
  }, [refreshDraftsAndStats, addNotification]);

  const handleClearCrashSnapshotFromStorage = useCallback(async () => {
    await dbService.clearCrashSnapshot();
    setCrashSnapshot(null);
    await refreshDraftsAndStats();
    addNotification('Crash recovery snapshot cleared', 'success');
  }, [refreshDraftsAndStats, addNotification]);

  const handleDeleteLocalFontById = useCallback((id: string) => {
    const updated = localFonts.filter(f => f.id !== id);
    setLocalFonts(updated);
    saveLocalFontsToStorage(updated);
    addNotification('Custom font removed from storage', 'success');
  }, [localFonts, addNotification]);

  const restoreDefaultPrompt = () => {
    setCustomPrompt('Translate naturally for a family drama setting.');
    addLog("Default prompt restored.", "info");
  };

  const restoreCache = async () => {
    try {
      const saved = await dbService.loadState();
      if (saved) {
        setSubtitles(saved.subtitles || []);
        if (saved.subtitles) {
          historyRef.current = [saved.subtitles];
          historyIndexRef.current = 0;
          setHistory([saved.subtitles]);
          setHistoryIndex(0);
        }
        setContext(saved.context || '');
        setCustomPrompt(saved.customPrompt || '');
        setLogs(saved.logs || []);
        setFileName(saved.fileName || '');
        if (saved.selectedModel) setSelectedModel(saved.selectedModel);
        if (saved.googleApiKey) setGoogleApiKey(saved.googleApiKey);
        if ((saved as any).activeStylingConfig) setActiveStylingConfig((saved as any).activeStylingConfig);
        if ((saved as any).isWorkspaceStylingPreview !== undefined) setIsWorkspaceStylingPreview(Boolean((saved as any).isWorkspaceStylingPreview));
        if ((saved as any).studioColumnsToDisplay) setStudioColumnsToDisplay((saved as any).studioColumnsToDisplay);
        if (saved.visibleColumns) setVisibleColumns(saved.visibleColumns);
        addLog("Project and styling cache restored manually.", "success");
        addNotification("Project memory restored", "success");
      } else {
        addLog("No cache found.", "warning");
      }
    } catch (e) {
      addLog("Failed to restore cache.", "error");
    }
  };

  const refreshDownloadSession = () => {
    // This function simulates a "refresh" for the browser's download manager
    // by clearing temporary states and potentially updating the session ID
    const newId = `GCS-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    setSessionId(newId);
    
    // Clear any existing object URLs if we were tracking them (we aren't explicitly, but good practice)
    addLog("Download session refreshed. Browser download state reset.", "success");
  };

  // Live 3-Streams Preview Sample Texts for Header (Cleaned, Formatted & Tag-Free)
  const previewSource = useMemo(() => {
    const item = subtitles.find(s => s.text && stripFormatting(s.text).trim().length > 0);
    return formatSubtitlePreview(item?.text, 'Cinematic Dialogue & Narrative Flow');
  }, [subtitles]);

  const previewAi = useMemo(() => {
    const item = subtitles.find(s => s.translatedText && stripFormatting(s.translatedText).trim().length > 0);
    return formatSubtitlePreview(item?.translatedText, 'ہر بات میں ایک گہرا احساس چھپا ہے');
  }, [subtitles]);

  const previewGoogle = useMemo(() => {
    const item = subtitles.find(s => s.googleTranslateText && stripFormatting(s.googleTranslateText).trim().length > 0);
    return formatSubtitlePreview(item?.googleTranslateText, 'یہ ایک معیاری اور درست ترجمہ ہے');
  }, [subtitles]);

  const sampleSourceText = previewSource.plain;
  const sampleAiText = previewAi.plain;
  const sampleGoogleText = previewGoogle.plain;

  const [isWorkerMonitorOpen, setIsWorkerMonitorOpen] = useState(false);
  const [workerStates, setWorkerStates] = useState<Record<string, { id: number, status: 'idle' | 'working' | 'completed', currentItem?: number }>>({});

  // Debounce search input to avoid searching on every single keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Escape key & Global Undo/Redo Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTextResizeOpen(false);
        setIsFontsOpen(false);
        setIsHomeDrawerOpen(false);
        setIsTranslatorDrawerOpen(false);
        setIsWorkspaceDrawerOpen(false);
      }

      // Global Undo/Redo Shortcuts (when not editing an input or textarea)
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditingInput = targetTag === 'input' || targetTag === 'textarea';

      if (!isEditingInput) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey)
        ) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // Per-block Undo / Redo helpers
  const recordBlockEdit = useCallback((
    index: number,
    prevSnap: { text: string; translatedText?: string; googleTranslateText?: string },
    nextSnap: { text: string; translatedText?: string; googleTranslateText?: string }
  ) => {
    if (
      prevSnap.text === nextSnap.text &&
      prevSnap.translatedText === nextSnap.translatedText &&
      prevSnap.googleTranslateText === nextSnap.googleTranslateText
    ) {
      return;
    }
    const existing = blockHistoryRef.current.get(index);
    if (!existing) {
      blockHistoryRef.current.set(index, { stack: [prevSnap, nextSnap], ptr: 1 });
    } else {
      const nextStack = existing.stack.slice(0, existing.ptr + 1);
      nextStack.push(nextSnap);
      if (nextStack.length > 30) nextStack.shift();
      blockHistoryRef.current.set(index, { stack: nextStack, ptr: nextStack.length - 1 });
    }
    setBlockHistoryVersion(v => v + 1);
  }, []);

  const canUndoBlock = useCallback((index: number) => {
    void blockHistoryVersion;
    const entry = blockHistoryRef.current.get(index);
    return Boolean(entry && entry.ptr > 0);
  }, [blockHistoryVersion]);

  const canRedoBlock = useCallback((index: number) => {
    void blockHistoryVersion;
    const entry = blockHistoryRef.current.get(index);
    return Boolean(entry && entry.ptr < entry.stack.length - 1);
  }, [blockHistoryVersion]);

  const handleUndoBlock = useCallback((index: number) => {
    const entry = blockHistoryRef.current.get(index);
    if (!entry || entry.ptr <= 0) return;
    const nextPtr = entry.ptr - 1;
    const snap = entry.stack[nextPtr];
    entry.ptr = nextPtr;
    setBlockHistoryVersion(v => v + 1);
    updateSubtitles(prev => prev.map(s => s.index === index ? { ...s, ...snap } : s));
    addNotification(`Undid edit on block #${index}`, 'success');
  }, [updateSubtitles, addNotification]);

  const handleRedoBlock = useCallback((index: number) => {
    const entry = blockHistoryRef.current.get(index);
    if (!entry || entry.ptr >= entry.stack.length - 1) return;
    const nextPtr = entry.ptr + 1;
    const snap = entry.stack[nextPtr];
    entry.ptr = nextPtr;
    setBlockHistoryVersion(v => v + 1);
    updateSubtitles(prev => prev.map(s => s.index === index ? { ...s, ...snap } : s));
    addNotification(`Redid edit on block #${index}`, 'success');
  }, [updateSubtitles, addNotification]);

  const handleManualEdit = useCallback((index: number, newText: string) => {
    if (isReadOnly) return;
    const target = subtitlesRef.current.find(s => s.index === index);
    if (target) {
      recordBlockEdit(
        index,
        { text: target.text, translatedText: target.translatedText, googleTranslateText: target.googleTranslateText },
        { text: target.text, translatedText: newText, googleTranslateText: target.googleTranslateText }
      );
    }
    updateSubtitles(prev => prev.map(s => s.index === index ? { ...s, translatedText: newText } : s));
  }, [isReadOnly, updateSubtitles, recordBlockEdit]);

  const handleManualEditOriginal = useCallback((index: number, newText: string) => {
    if (isReadOnly) return;
    const target = subtitlesRef.current.find(s => s.index === index);
    if (target) {
      recordBlockEdit(
        index,
        { text: target.text, translatedText: target.translatedText, googleTranslateText: target.googleTranslateText },
        { text: newText, translatedText: target.translatedText, googleTranslateText: target.googleTranslateText }
      );
    }
    updateSubtitles(prev => prev.map(s => s.index === index ? { ...s, text: newText } : s));
  }, [isReadOnly, updateSubtitles, recordBlockEdit]);

  const handleManualEditGoogle = useCallback((index: number, newText: string) => {
    if (isReadOnly) return;
    const target = subtitlesRef.current.find(s => s.index === index);
    if (target) {
      recordBlockEdit(
        index,
        { text: target.text, translatedText: target.translatedText, googleTranslateText: target.googleTranslateText },
        { text: target.text, translatedText: target.translatedText, googleTranslateText: newText }
      );
    }
    updateSubtitles(prev => prev.map(s => s.index === index ? { ...s, googleTranslateText: newText } : s));
  }, [isReadOnly, updateSubtitles, recordBlockEdit]);

  const handleInsertSubtitle = useCallback((afterIndex?: number) => {
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    updateSubtitles(prev => insertSubtitle(prev, afterIndex));
    addNotification("Inserted new subtitle line", "success");
    addLog(`Inserted new subtitle segment after #${afterIndex || 'end'}.`, "info");
  }, [isReadOnly, updateSubtitles, addNotification, addLog]);

  const handleSplitSubtitle = useCallback((index: number) => {
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    updateSubtitles(prev => splitSubtitle(prev, index));
    addNotification(`Split segment #${index} into two`, "success");
    addLog(`Split subtitle segment #${index} into two segments.`, "info");
  }, [isReadOnly, updateSubtitles, addNotification, addLog]);

  const handleDeleteSubtitle = useCallback((index: number) => {
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    updateSubtitles(prev => deleteSubtitle(prev, index));
    addNotification(`Deleted segment #${index}`, "success");
    addLog(`Deleted subtitle segment #${index}.`, "info");
  }, [isReadOnly, updateSubtitles, addNotification, addLog]);

  const deleteSelectedSubtitles = useCallback(() => {
    if (selectedIndices.size === 0) return;
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    const count = selectedIndices.size;
    updateSubtitles(prev => batchDeleteSubtitles(prev, selectedIndices));
    setSelectedIndices(new Set());
    addNotification(`Deleted ${count} selected subtitle(s)`, "success");
    addLog(`Batch deleted ${count} subtitle segments.`, "info");
  }, [selectedIndices, isReadOnly, updateSubtitles, addNotification, addLog]);

  // Per-stream Undo / Redo helpers
  const canUndoStream = useCallback((field: WorkspaceStreamField) => {
    void streamHistoryVersion;
    const entry = streamHistoryRef.current[field];
    return Boolean(entry && entry.ptr > 0);
  }, [streamHistoryVersion]);

  const canRedoStream = useCallback((field: WorkspaceStreamField) => {
    void streamHistoryVersion;
    const entry = streamHistoryRef.current[field];
    return Boolean(entry && entry.ptr >= 0 && entry.ptr < entry.stack.length - 1);
  }, [streamHistoryVersion]);

  const handleUndoStream = useCallback((field: WorkspaceStreamField) => {
    const entry = streamHistoryRef.current[field];
    if (!entry || entry.ptr <= 0) return;
    const nextPtr = entry.ptr - 1;
    const snapshotArr = entry.stack[nextPtr];
    entry.ptr = nextPtr;
    setStreamHistoryVersion(v => v + 1);
    isStreamHistoryNavigating.current = true;
    updateSubtitles(prev =>
      prev.map((s, idx) => {
        const val = snapshotArr[idx];
        if (val === undefined) return s;
        if (field === 'orig') return { ...s, text: val };
        if (field === 'ai') return { ...s, translatedText: val };
        return { ...s, googleTranslateText: val };
      })
    );
    setTimeout(() => { isStreamHistoryNavigating.current = false; }, 50);
    const label = field === 'orig' ? 'Original' : field === 'ai' ? 'AI Translation' : 'Neutral / Google';
    addNotification(`Undid change in ${label} column`, 'success');
  }, [updateSubtitles, addNotification]);

  const handleRedoStream = useCallback((field: WorkspaceStreamField) => {
    const entry = streamHistoryRef.current[field];
    if (!entry || entry.ptr >= entry.stack.length - 1) return;
    const nextPtr = entry.ptr + 1;
    const snapshotArr = entry.stack[nextPtr];
    entry.ptr = nextPtr;
    setStreamHistoryVersion(v => v + 1);
    isStreamHistoryNavigating.current = true;
    updateSubtitles(prev =>
      prev.map((s, idx) => {
        const val = snapshotArr[idx];
        if (val === undefined) return s;
        if (field === 'orig') return { ...s, text: val };
        if (field === 'ai') return { ...s, translatedText: val };
        return { ...s, googleTranslateText: val };
      })
    );
    setTimeout(() => { isStreamHistoryNavigating.current = false; }, 50);
    const label = field === 'orig' ? 'Original' : field === 'ai' ? 'AI Translation' : 'Neutral / Google';
    addNotification(`Redid change in ${label} column`, 'success');
  }, [updateSubtitles, addNotification]);

  const handleSplitAllLong = useCallback(() => {
    if (isReadOnly) {
      addNotification("Editing is locked in Read-Only mode", "error");
      return;
    }
    if (subtitlesRef.current.length === 0) return;
    const { updatedSubtitles, splitBlocksCount, createdBlocksCount } = splitAllLongSubtitles(subtitlesRef.current, 2, 42);
    if (splitBlocksCount === 0) {
      addNotification("All subtitle blocks are already short (≤ 2 lines)", "success");
      return;
    }
    updateSubtitles(updatedSubtitles);
    addNotification(`Divided ${splitBlocksCount} long subtitle block(s) into ${splitBlocksCount + createdBlocksCount} ≤ 2-line segments`, "success");
    addLog(`Divided ${splitBlocksCount} long subtitle block(s) into ${splitBlocksCount + createdBlocksCount} compact ≤ 2-line segments.`, "success");
  }, [isReadOnly, updateSubtitles, addNotification, addLog]);

  const colHeaderLongPressRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; x: number; y: number }>({
    timer: null,
    x: 0,
    y: 0,
  });

  const clearColHeaderLongPress = () => {
    if (colHeaderLongPressRef.current.timer) {
      clearTimeout(colHeaderLongPressRef.current.timer);
      colHeaderLongPressRef.current.timer = null;
    }
  };

  const startColHeaderLongPress = (e: React.TouchEvent, field: WorkspaceStreamField) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, label')) return;
    const t = e.touches[0];
    if (!t) return;
    colHeaderLongPressRef.current.x = t.clientX;
    colHeaderLongPressRef.current.y = t.clientY;
    const pos = { x: t.clientX, y: t.clientY };
    clearColHeaderLongPress();
    colHeaderLongPressRef.current.timer = setTimeout(() => {
      colHeaderLongPressRef.current.timer = null;
      setColumnHistoryMenu({ field, x: pos.x, y: pos.y });
    }, 450);
  };

  const moveColHeaderLongPress = (e: React.TouchEvent) => {
    if (!colHeaderLongPressRef.current.timer) return;
    const t = e.touches[0];
    if (!t) return;
    if (
      Math.abs(t.clientX - colHeaderLongPressRef.current.x) > 8 ||
      Math.abs(t.clientY - colHeaderLongPressRef.current.y) > 8
    ) {
      clearColHeaderLongPress();
    }
  };

  // Confirmation-wrapped critical workspace operations (Yes / No popups)
  const confirmClearSelectedAI = useCallback(() => {
    if (selectedIndices.size === 0) return;
    setConfirmDialog({
      title: 'Clear AI Translations?',
      message: `Clear AI translation text from ${selectedIndices.size} selected block(s)? Timestamps and block numbers will be preserved.`,
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        clearSelectedTranslations();
      },
    });
  }, [selectedIndices.size, clearSelectedTranslations]);

  const confirmClearSelectedGoogle = useCallback(() => {
    if (selectedIndices.size === 0) return;
    setConfirmDialog({
      title: 'Clear Neutral / Google Translations?',
      message: `Clear Neutral / Google translation text from ${selectedIndices.size} selected block(s)?`,
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        clearSelectedGoogleTranslations();
      },
    });
  }, [selectedIndices.size, clearSelectedGoogleTranslations]);

  const confirmClearSelectedBoth = useCallback(() => {
    if (selectedIndices.size === 0) return;
    setConfirmDialog({
      title: 'Clear Both Translation Streams?',
      message: `Clear both AI and Neutral/Google translations from ${selectedIndices.size} selected block(s)?`,
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        clearSelectedBothTranslations();
      },
    });
  }, [selectedIndices.size, clearSelectedBothTranslations]);

  const confirmDeleteSelectedSubtitles = useCallback(() => {
    if (selectedIndices.size === 0) return;
    setConfirmDialog({
      title: 'Delete Selected Subtitles?',
      message: `Permanently remove ${selectedIndices.size} selected subtitle row(s) from this workspace?`,
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        deleteSelectedSubtitles();
      },
    });
  }, [selectedIndices.size, deleteSelectedSubtitles]);

  const confirmResetTimings = useCallback(() => {
    setConfirmDialog({
      title: 'Reset All Timings?',
      message: 'Restore all subtitle timestamps back to the original baseline timings?',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        handleResetTimingsToOriginal();
      },
    });
  }, [handleResetTimingsToOriginal]);

  const confirmResetBaseline = useCallback(() => {
    if (historyRef.current.length === 0) return;
    setConfirmDialog({
      title: 'Undo All / Reset to Baseline?',
      message: 'Revert all subtitle edits and translations in this session back to the initial baseline state?',
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        if (historyRef.current.length > 0) {
          const baseline = historyRef.current[0];
          subtitlesRef.current = baseline;
          setSubtitles(baseline);
          historyRef.current = [baseline];
          historyIndexRef.current = 0;
          setHistory([baseline]);
          setHistoryIndex(0);
          blockHistoryRef.current.clear();
          setBlockHistoryVersion(v => v + 1);
          resetStreamHistory(baseline);
          addNotification('Reset to baseline', 'success');
          addLog('Reset subtitles to initial baseline.', 'warning');
        }
      },
    });
  }, [addNotification, addLog, resetStreamHistory]);

  const confirmClearSingleField = useCallback((index: number, field: WorkspaceStreamField) => {
    const label = field === 'orig' ? 'Original' : field === 'ai' ? 'AI Translation' : 'Neutral / Google';
    setConfirmDialog({
      title: `Clear ${label} Text?`,
      message: `Clear the ${label} text in subtitle block #${index}?`,
      danger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        if (field === 'orig') handleManualEditOriginal(index, '');
        else if (field === 'ai') handleManualEdit(index, '');
        else handleManualEditGoogle(index, '');
        addNotification(`Cleared ${label} on block #${index}`, 'success');
      },
    });
  }, [handleManualEditOriginal, handleManualEdit, handleManualEditGoogle, addNotification]);

  const hasActiveDrawerForTab =
    activeTab === 'home' || activeTab === 'translator' || activeTab === 'workspace' || activeTab === 'styling';
  const isCurrentTabDrawerOpen =
    (activeTab === 'home' && isHomeDrawerOpen) ||
    (activeTab === 'translator' && isTranslatorDrawerOpen) ||
    (activeTab === 'workspace' && isWorkspaceDrawerOpen) ||
    (activeTab === 'styling' && isStylingDrawerOpen);

  const openActiveTabDrawer = useCallback(() => {
    if (activeTab === 'home') setIsHomeDrawerOpen(true);
    else if (activeTab === 'translator') setIsTranslatorDrawerOpen(true);
    else if (activeTab === 'workspace') setIsWorkspaceDrawerOpen(true);
    else if (activeTab === 'styling') setIsStylingDrawerOpen(true);
  }, [activeTab]);

  // Slide-open exclusive tab drawers by swiping left from the right edge of the screen
  useEffect(() => {
    const anyBlockingModalOpen =
      isEditorModalOpen ||
      isAiCinemaOpen ||
      isStylingDrawerOpen ||
      isPreviewSpaceOpen ||
      isGoogleSettingsOpen ||
      isAiConfigOpen ||
      isUnifiedDownloadOpen ||
      isFindReplaceOpen ||
      isTimeShiftOpen ||
      isGapTimingOpen ||
      isTextCleanupOpen ||
      isWatermarkModalOpen ||
      isStylizerOpen ||
      isTranslationSettingsModalOpen ||
      isTextResizeOpen ||
      isFontsOpen ||
      isCurrentTabDrawerOpen;

    if (!hasActiveDrawerForTab || anyBlockingModalOpen) return;

    const edgeGesture = {
      active: false,
      startX: 0,
      startY: 0,
    };

    const startIfRightEdge = (clientX: number, clientY: number, target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (el && el.closest('input[type="range"]')) return;
      if (clientX >= window.innerWidth - 36) {
        edgeGesture.active = true;
        edgeGesture.startX = clientX;
        edgeGesture.startY = clientY;
      } else {
        edgeGesture.active = false;
      }
    };

    const checkEdgeSwipe = (clientX: number, clientY: number) => {
      if (!edgeGesture.active) return;
      const dx = clientX - edgeGesture.startX;
      const dy = clientY - edgeGesture.startY;
      if (Math.abs(dy) > 22 && Math.abs(dy) > Math.abs(dx)) {
        edgeGesture.active = false;
        return;
      }
      if (dx <= -24 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        edgeGesture.active = false;
        openActiveTabDrawer();
      }
    };

    const resetEdgeGesture = () => {
      edgeGesture.active = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) startIfRightEdge(t.clientX, t.clientY, e.target);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) checkEdgeSwipe(t.clientX, t.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startIfRightEdge(e.clientX, e.clientY, e.target);
    };
    const onPointerMove = (e: PointerEvent) => {
      checkEdgeSwipe(e.clientX, e.clientY);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', resetEdgeGesture, { passive: true });
    window.addEventListener('touchcancel', resetEdgeGesture, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', resetEdgeGesture, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', resetEdgeGesture);
      window.removeEventListener('touchcancel', resetEdgeGesture);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', resetEdgeGesture);
    };
  }, [
    hasActiveDrawerForTab,
    isCurrentTabDrawerOpen,
    openActiveTabDrawer,
    isEditorModalOpen,
    isAiCinemaOpen,
    isStylingDrawerOpen,
    isPreviewSpaceOpen,
    isGoogleSettingsOpen,
    isAiConfigOpen,
    isUnifiedDownloadOpen,
    isFindReplaceOpen,
    isTimeShiftOpen,
    isGapTimingOpen,
    isTextCleanupOpen,
    isWatermarkModalOpen,
    isStylizerOpen,
    isTranslationSettingsModalOpen,
    isTextResizeOpen,
    isFontsOpen,
  ]);

  const TAB_ITEMS: { id: MobileTab; label: string; shortLabel: string; icon: any }[] = [
    { id: 'home', label: 'Home', shortLabel: 'Home', icon: Home },
    { id: 'translator', label: 'Translate', shortLabel: 'Translate', icon: Sparkles },
    { id: 'workspace', label: 'Workspace', shortLabel: 'Workspace', icon: Languages },
    { id: 'styling', label: 'Styling', shortLabel: 'Styling', icon: Palette },
    { id: 'download', label: 'Export', shortLabel: 'Export', icon: Download },
    { id: 'menu', label: 'Menu', shortLabel: 'Menu', icon: Settings },
  ];

  const useMobileCards = isMobileViewport && preferences.mobileSubtitleView !== 'table';
  const showHeaderCompact = preferences.headerVisibility.compactMode;

  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  const isAnyOverlayOpen =
    isHomeDrawerOpen ||
    isTranslatorDrawerOpen ||
    isWorkspaceDrawerOpen ||
    isTextResizeOpen ||
    isFontsOpen ||
    isOnScreenSlidersOpen ||
    isEditorModalOpen ||
    isAiCinemaOpen ||
    isStylingDrawerOpen ||
    isPreviewSpaceOpen ||
    isGoogleSettingsOpen ||
    isAiConfigOpen ||
    isUnifiedDownloadOpen ||
    isFindReplaceOpen ||
    isTimeShiftOpen ||
    isGapTimingOpen ||
    isTextCleanupOpen ||
    isWatermarkModalOpen ||
    isStylizerOpen ||
    isTranslationSettingsModalOpen ||
    isAndroidSetupModalOpen ||
    Boolean(confirmDialog) ||
    Boolean(fieldActionMenu) ||
    Boolean(columnHistoryMenu);

  // Auto-hide bottom navigation bar on downward scroll, show on upward scroll
  useEffect(() => {
    setIsBottomNavVisible(true);
  }, [activeTab]);

  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      if (currentY <= 30) {
        setIsBottomNavVisible(true);
      } else if (delta > 10 && currentY > 44) {
        setIsBottomNavVisible(false);
      } else if (delta < -8) {
        setIsBottomNavVisible(true);
      }
      lastScrollY = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Totally hide header & footer chrome when virtual keyboard / inline editing is active
  useEffect(() => {
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    let baselineHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    const isTextEditableEl = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName === 'INPUT') {
        const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
        return !['checkbox', 'radio', 'range', 'file', 'color', 'button', 'submit', 'reset'].includes(type);
      }
      return el.isContentEditable;
    };

    const onFocusIn = (e: FocusEvent) => {
      if (blurTimer) clearTimeout(blurTimer);
      if (isTextEditableEl(e.target)) {
        setIsKeyboardActive(true);
      }
    };

    const onFocusOut = () => {
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        const vv = window.visualViewport;
        const vvShrink = vv ? baselineHeight - vv.height > 130 : false;
        setIsKeyboardActive(isTextEditableEl(document.activeElement) || vvShrink);
      }, 85);
    };

    const onViewportResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      if (vv.height > baselineHeight) baselineHeight = vv.height;
      const vvShrink = baselineHeight - vv.height > 130;
      setIsKeyboardActive(vvShrink || isTextEditableEl(document.activeElement));
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', onViewportResize);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    };
  }, []);

  // Reference-counted body scroll lock (guarantees scrolling unlocks cleanly whenever popups close)
  useBodyScrollLock(isAnyOverlayOpen);

  // Sync Android Status Bar with current theme
  useEffect(() => {
    void syncAndroidStatusBarTheme(preferences.theme === 'classic');
  }, [preferences.theme]);

  // Ref for Android hardware/gesture Back button & native lifecycle
  const androidBackHandlerRef = useRef<() => boolean>(() => false);
  androidBackHandlerRef.current = () => {
    if (confirmDialog) { setConfirmDialog(null); return true; }
    if (isAndroidSetupModalOpen) {
      try { localStorage.setItem('urdu_localizer_android_setup_done', '1'); } catch {}
      setIsAndroidSetupModalOpen(false);
      return true;
    }
    if (invokeRegisteredBackHandlers()) return true;
    if (fieldActionMenu) { setFieldActionMenu(null); return true; }
    if (columnHistoryMenu) { setColumnHistoryMenu(null); return true; }
    if (isEditorModalOpen) { setIsEditorModalOpen(false); return true; }
    if (isFindReplaceOpen) { setIsFindReplaceOpen(false); return true; }
    if (isTimeShiftOpen) { setIsTimeShiftOpen(false); return true; }
    if (isGapTimingOpen) { setIsGapTimingOpen(false); return true; }
    if (isTextCleanupOpen) { setIsTextCleanupOpen(false); return true; }
    if (isWatermarkModalOpen) { setIsWatermarkModalOpen(false); return true; }
    if (isStylizerOpen) { setIsStylizerOpen(false); return true; }
    if (isTranslationSettingsModalOpen) { setIsTranslationSettingsModalOpen(false); return true; }
    if (isTextResizeOpen) { setIsTextResizeOpen(false); return true; }
    if (isFontsOpen) { setIsFontsOpen(false); return true; }
    if (isOnScreenSlidersOpen) { setIsOnScreenSlidersOpen(false); return true; }
    if (isPreviewSpaceOpen) { setIsPreviewSpaceOpen(false); return true; }
    if (isGoogleSettingsOpen) { setIsGoogleSettingsOpen(false); return true; }
    if (isAiConfigOpen) { setIsAiConfigOpen(false); return true; }
    if (isUnifiedDownloadOpen) { setIsUnifiedDownloadOpen(false); return true; }
    if (isAiCinemaOpen) { setIsAiCinemaOpen(false); return true; }
    if (isWorkerMonitorOpen) { setIsWorkerMonitorOpen(false); return true; }
    if (isHomeDrawerOpen) { setIsHomeDrawerOpen(false); return true; }
    if (isTranslatorDrawerOpen) { setIsTranslatorDrawerOpen(false); return true; }
    if (isWorkspaceDrawerOpen) { setIsWorkspaceDrawerOpen(false); return true; }
    if (isStylingDrawerOpen) { setIsStylingDrawerOpen(false); return true; }
    if (activeTab !== 'home') {
      setActiveTab('home');
      return true;
    }
    const now = Date.now();
    if (now - lastBackPressRef.current > 2200) {
      lastBackPressRef.current = now;
      addNotification('Press Back again to exit app', 'warning');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const cleanup = initAndroidNativeShell({
      isLightTheme: preferencesRef.current.theme === 'classic',
      onKeyboardChange: (visible) => setIsKeyboardActive(visible),
      onNetworkChange: (connected) => setIsOnline(connected),
      onBackButton: () => androidBackHandlerRef.current(),
      onIncomingFile: (payload) => {
        void processSubtitleContentRef.current(payload.name, payload.content);
      },
    });

    if (isNativeAndroid()) {
      let alreadyDone = false;
      try {
        alreadyDone = localStorage.getItem('urdu_localizer_android_setup_done') === '1';
      } catch {
        alreadyDone = false;
      }
      if (!alreadyDone) {
        setTimeout(() => {
          void getAndroidPermissionSnapshot().then(async (snap) => {
            if (!snap.isNativeAndroid) return;
            if (snap.needsRuntimePrompt) {
              await requestAndroidStoragePermission();
            }
            const refreshed = await getAndroidPermissionSnapshot();
            if (refreshed.needsRuntimePrompt || !refreshed.exportFolder) {
              setAndroidSetupStatus({
                needsRuntimePrompt: refreshed.needsRuntimePrompt,
                folderName: refreshed.exportFolder?.name || null,
                sdkInt: refreshed.sdkInt,
              });
              setIsAndroidSetupModalOpen(true);
            } else {
              try { localStorage.setItem('urdu_localizer_android_setup_done', '1'); } catch {}
            }
          });
        }, 450);
      }
    }

    return cleanup;
  }, [addNotification]);

  const showWorkspacePinnedFooter = activeTab === 'workspace' && filteredSubtitles.length > 0 && !isKeyboardActive;

  return (
    <div
      className={cn(
        'min-h-screen font-sans flex flex-col transition-colors duration-200 theme-root',
        theme !== 'classic' && 'dark'
      )}
      style={{
        backgroundColor: 'var(--theme-canvas)',
        color: 'var(--theme-text)',
        '--translated-font-size': `${isGlobalFontActive ? globalFontSize : translatedFontSize}px`,
        '--original-font-size': `${isGlobalFontActive ? globalFontSize : originalFontSize}px`,
        '--google-font-size': `${isGlobalFontActive ? globalFontSize : googleFontSize}px`,
        '--urdu-font': isGlobalFontActive ? globalFont : urduFont,
        '--original-font': isGlobalFontActive ? globalFont : originalFont,
        '--google-font': isGlobalFontActive ? globalFont : googleFont,
      } as React.CSSProperties}
    >
      {/* Auto-Hide Toast Stack positioned clear of bottom nav, workspace footer, and bottom-right controls */}
      <div
        className={cn(
          'fixed right-3 sm:right-5 z-[220] pb-safe flex flex-col gap-1.5 pointer-events-none max-w-[calc(100vw-24px)] mobile-fixed-chrome transition-[bottom] duration-150',
          isKeyboardActive
            ? 'bottom-3'
            : activeTab === 'translator'
            ? isBottomNavVisible
              ? 'bottom-[216px] lg:bottom-[170px]'
              : 'bottom-[170px] lg:bottom-[170px]'
            : activeTab === 'workspace'
            ? isBottomNavVisible
              ? 'bottom-[168px] lg:bottom-[120px]'
              : 'bottom-[120px] lg:bottom-[120px]'
            : hasActiveDrawerForTab
            ? isBottomNavVisible
              ? 'bottom-[118px] lg:bottom-[76px]'
              : 'bottom-[74px] lg:bottom-[76px]'
            : isBottomNavVisible
            ? 'bottom-[62px] lg:bottom-5'
            : 'bottom-3 lg:bottom-5'
        )}
      >
        <AnimatePresence>
          {notifications.map((n) => {
            const isWarn = n.type === 'warning';
            const isErr = n.type === 'error' || n.type === 'not-saved';
            const isSaved = n.type === 'saved';
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="pointer-events-auto px-3 py-2 rounded-xl border shadow-lg flex items-center gap-2 min-w-[200px] max-w-xs"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: isErr
                    ? 'rgba(239, 68, 68, 0.45)'
                    : isWarn
                    ? 'rgba(245, 158, 11, 0.45)'
                    : 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              >
                {isWarn ? (
                  <AlertTriangle size={15} className="shrink-0 text-amber-500" />
                ) : isErr ? (
                  <AlertCircle size={15} className="shrink-0 text-red-500" />
                ) : isSaved ? (
                  <Save size={15} className="shrink-0" style={{ color: 'var(--theme-accent)' }} />
                ) : (
                  <CheckCircle2 size={15} className="shrink-0" style={{ color: 'var(--theme-accent)' }} />
                )}
                <p className="text-[11px] font-semibold leading-snug">{n.message}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Slim Top Header (totally hidden when keyboard is active for edits) */}
      {!isKeyboardActive && (
      <header
        className={cn(
          'sticky top-0 z-50 border-b px-3 sm:px-5 pt-safe flex items-center justify-between gap-2 backdrop-blur-md transition-all mobile-fixed-chrome overflow-x-clip',
          showHeaderCompact ? 'min-h-[40px] py-1' : 'min-h-[46px] py-1.5',
          isAnyOverlayOpen && 'pointer-events-none select-none'
        )}
        style={{
          backgroundColor: 'var(--theme-header)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 text-left min-w-0 cursor-pointer"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 overflow-hidden"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            {(() => {
              const dev = preferences.developerSettings || DEFAULT_DEVELOPER_SETTINGS;
              const iconSize = 15;
              if (dev.iconId === 'custom' && dev.customIconDataUrl) {
                return <img src={dev.customIconDataUrl} alt={dev.appName} className="w-full h-full object-cover" />;
              }
              if (dev.iconId === 'sparkles') return <Sparkles size={iconSize} />;
              if (dev.iconId === 'clapperboard') return <Clapperboard size={iconSize} />;
              if (dev.iconId === 'film') return <Film size={iconSize} />;
              if (dev.iconId === 'globe') return <Globe size={iconSize} />;
              return <Languages size={iconSize} />;
            })()}
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold tracking-tight text-xs sm:text-[13px] flex items-center gap-1 truncate">
              <span className="truncate">{preferences.developerSettings?.appName || 'Urdu Localizer'}</span>
              {(preferences.developerSettings?.appBadge ?? 'v3') && (
                <span className="font-mono text-[10px] font-semibold shrink-0" style={{ color: 'var(--theme-accent)' }}>
                  {preferences.developerSettings?.appBadge ?? 'v3'}
                </span>
              )}
            </h1>
            {preferences.headerVisibility.showFileName && fileName && (
              <p className="text-[9px] opacity-55 font-mono truncate max-w-[130px] sm:max-w-[220px]">{fileName}</p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Desktop Quick Studios */}
          <div className="hidden lg:flex items-center gap-1">
            {preferences.menuVisibility.showCinemaStudio && (
              <button
                type="button"
                onClick={() => setIsAiCinemaOpen(true)}
                className="min-h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
                title="AI Cinema"
              >
                <Clapperboard size={13} style={{ color: 'var(--theme-accent)' }} />
                <span>Cinema</span>
              </button>
            )}
            {preferences.menuVisibility.showEditStudio && (
              <button
                type="button"
                onClick={() => handleOpenEditor()}
                className="min-h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
                title="Edit Studio"
              >
                <Edit3 size={13} style={{ color: 'var(--theme-accent)' }} />
                <span>Studio</span>
              </button>
            )}
          </div>

          {preferences.headerVisibility.showZoomChip && (
            <button
              type="button"
              onClick={() => setIsOnScreenSlidersOpen((prev) => !prev)}
              className="min-h-[32px] flex items-center gap-1 px-2 rounded-lg border text-[10px] font-mono font-semibold tabular-nums cursor-pointer"
              style={{
                backgroundColor: isOnScreenSlidersOpen ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                borderColor: isOnScreenSlidersOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
              }}
              title="Zoom & Spacing Sliders"
            >
              <ZoomIn size={12} style={{ color: 'var(--theme-accent)' }} />
              <span>{preferences.uiZoom}%</span>
            </button>
          )}

          <ThemeSelector currentTheme={theme} onThemeChange={handleThemeChange} />

          {preferences.headerVisibility.showSaveIndicator && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2 min-h-[32px] rounded-lg border text-[10px] font-medium"
              style={{
                backgroundColor: 'var(--theme-elevated)',
                borderColor: 'var(--theme-border)',
              }}
              title={saveStatus === 'saving' ? 'Saving...' : 'Saved locally'}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', saveStatus === 'saving' ? 'bg-amber-500' : 'bg-emerald-500')} />
              <span>{saveStatus === 'saving' ? 'Saving' : 'Saved'}</span>
            </div>
          )}

          {preferences.headerVisibility.showNetworkPill && (
            <div
              className="flex items-center gap-1 px-2 min-h-[32px] rounded-lg border text-[10px] font-medium"
              style={{
                backgroundColor: 'var(--theme-elevated)',
                borderColor: 'var(--theme-border)',
              }}
              title={isOnline ? 'Online' : 'Offline'}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-amber-500')} />
              <span className="hidden xs:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={cn(
              'hidden lg:flex min-h-[32px] px-2 items-center gap-1 rounded-lg border transition-colors cursor-pointer',
              activeTab === 'menu' ? 'text-white' : ''
            )}
            style={
              activeTab === 'menu'
                ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
            }
            title="Settings"
          >
            <Menu size={15} />
          </button>
        </div>
      </header>
      )}

      {/* Desktop Slim Underline Navigation Strip */}
      {!isKeyboardActive && (
      <nav
        className={cn(
          'hidden lg:flex items-center justify-center gap-1 px-6 border-b h-9',
          isAnyOverlayOpen && 'pointer-events-none select-none'
        )}
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'h-9 px-3.5 flex items-center gap-1.5 text-[11px] font-semibold transition-colors cursor-pointer border-b-2',
                isActive ? 'opacity-100' : 'opacity-65 hover:opacity-100 border-transparent'
              )}
              style={
                isActive
                  ? { borderBottomColor: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }
                  : { color: 'var(--theme-text)' }
              }
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.id === 'translator' && (isTranslating || isGoogleTranslatingAll) && (
                <Loader2 size={11} className="animate-spin" />
              )}
              {tab.id === 'workspace' && subtitles.length > 0 && (
                <span className="text-[10px] font-mono opacity-70 tabular-nums">({subtitles.length})</span>
              )}
            </button>
          );
        })}
      </nav>
      )}

      {/* Slim Offline Indicator */}
      {!isOnline && !isKeyboardActive && (
        <div
          className="border-b px-3 py-1 text-center text-[11px] font-medium text-amber-500 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>Offline Mode · Local edits & exports remain active</span>
        </div>
      )}

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 p-2.5 sm:p-4 md:p-5 max-w-[1600px] mx-auto w-full flex flex-col gap-3.5',
          isKeyboardActive ? 'pb-6' : activeTab === 'workspace' ? 'pb-36 lg:pb-24' : 'pb-28 lg:pb-20',
          isAnyOverlayOpen && 'pointer-events-none select-none'
        )}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-500 shadow-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-xs font-bold flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/10 rounded-full cursor-pointer">
              <X size={14} />
            </button>
          </motion.div>
        )}

        {activeTab === 'home' && (
          <HomeTabView
            fileName={fileName}
            detectedFormat={detectedFormat}
            subtitlesCount={stats.total}
            translatedCount={stats.translated}
            googleCount={stats.google}
            activeDraftId={activeDraftId}
            drafts={drafts}
            crashSnapshot={crashSnapshot}
            onRecoverCrash={handleRecoverCrash}
            onDismissCrash={handleDismissCrash}
            onUploadFile={processSubtitleFile}
            onLoadFromUrl={handleLoadFromUrl}
            onLoadDemo={loadSampleSubtitles}
            onSaveCurrentAsDraft={handleSaveCurrentAsDraft}
            onLoadDraft={handleLoadDraft}
            onDuplicateDraft={handleDuplicateDraft}
            onDeleteDraft={handleDeleteDraft}
            onOpenWorkspace={() => setActiveTab('workspace')}
            onDiscardProject={resetProject}
            onOpenAiCinema={() => setIsAiCinemaOpen(true)}
          />
        )}

        {activeTab === 'translator' && (
          <TranslatorTabView
            subtitlesCount={stats.total}
            translatedCount={stats.translated}
            googleCount={stats.google}
            untranslatedCount={Math.max(0, stats.total - stats.translated)}
            isTranslating={isTranslating}
            isGoogleTranslatingAll={isGoogleTranslatingAll}
            translationSpeed={translationSpeed}
            isGeminiConnected={isGeminiConnected}
            selectedModel={selectedModel}
            geminiWorkers={geminiWorkers}
            geminiBatchSize={geminiBatchSize}
            geminiDelay={geminiDelay}
            googleWorkers={googleWorkers}
            googleBatchSize={googleBatchSize}
            adaptiveScalingEnabled={adaptiveScalingEnabled}
            activeAdaptiveInfo={activeAdaptiveInfo}
            onToggleAdaptiveScaling={setAdaptiveScalingEnabled}
            onUpdateWorkers={setGeminiWorkers}
            onUpdateBatchSize={setGeminiBatchSize}
            translationSettings={translationSettings}
            context={context}
            customPrompt={customPrompt}
            analyzeStatus={analyzeStatus}
            isGeneratingContext={isGeneratingContext}
            workerStates={workerStates}
            isWorkerMonitorOpen={isWorkerMonitorOpen}
            onToggleWorkerMonitor={() => setIsWorkerMonitorOpen(prev => !prev)}
            onStopTranslation={requestStopTranslation}
            onStopGoogleTranslate={requestStopGoogleTranslate}
            onOpenTranslationSettings={() => {
              setFocusedSettingsCategory('translation');
              setFocusedTranslationSub('language');
              setActiveTab('menu');
            }}
            onOpenAiConfig={() => {
              setFocusedSettingsCategory('translation');
              setFocusedTranslationSub('ai');
              setActiveTab('menu');
            }}
            onOpenGoogleConfig={() => {
              setFocusedSettingsCategory('translation');
              setFocusedTranslationSub('google');
              setActiveTab('menu');
            }}
            onAnalyzeSubtitles={analyzeSubtitles}
            onChangeContext={setContext}
            onChangeCustomPrompt={setCustomPrompt}
            onRestoreDefaultPrompt={restoreDefaultPrompt}
            enableTermGlossary={preferences.optionalFeatures.enableTermGlossary}
            glossary={glossary}
            onChangeGlossary={setGlossary}
          />
        )}

        {activeTab === 'styling' && (
          <StylingTabView
            subtitles={subtitles}
            subtitlesCount={subtitles.length}
            activeStylingConfig={activeStylingConfig}
            onOpenStylingDrawer={() => setIsStylingDrawerOpen(true)}
            onOpenWatermark={() => setIsWatermarkModalOpen(true)}
            onBakeAllStyles={() => handleBakeAllStyles(false)}
            urduFont={urduFont}
            originalFont={originalFont}
            googleFont={googleFont}
            globalFont={globalFont}
            isGlobalFontActive={isGlobalFontActive}
            translatedFontSize={translatedFontSize}
            originalFontSize={originalFontSize}
            googleFontSize={googleFontSize}
            globalFontSize={globalFontSize}
            localFonts={localFonts}
            isUploadingFont={isUploadingFont}
            onUpdateUrduFont={(font) => { setUrduFont(font); setHasPendingStyleBake(true); }}
            onUpdateOriginalFont={(font) => { setOriginalFont(font); setHasPendingStyleBake(true); }}
            onUpdateGoogleFont={(font) => { setGoogleFont(font); setHasPendingStyleBake(true); }}
            onUpdateGlobalFont={(font) => { setGlobalFont(font); setHasPendingStyleBake(true); }}
            onToggleGlobalFont={(active) => { setIsGlobalFontActive(active); setHasPendingStyleBake(true); }}
            onUpdateTranslatedFontSize={(size) => { setTranslatedFontSize(size); setHasPendingStyleBake(true); }}
            onUpdateOriginalFontSize={(size) => { setOriginalFontSize(size); setHasPendingStyleBake(true); }}
            onUpdateGoogleFontSize={(size) => { setGoogleFontSize(size); setHasPendingStyleBake(true); }}
            onUpdateGlobalFontSize={(size) => { setGlobalFontSize(size); setHasPendingStyleBake(true); }}
            onUploadFontFile={handleUploadFontFile}
          />
        )}

        {activeTab === 'download' && (
          <DownloadTabView
            subtitles={subtitles}
            fileName={fileName}
            detectedFormat={detectedFormat}
            translationSettings={translationSettings}
            isTranslating={isTranslating}
            isGoogleTranslatingAll={isGoogleTranslatingAll}
            androidSaveMode={preferences.androidSaveMode || 'documents'}
            onChangeAndroidSaveMode={(mode: AndroidSaveMode) =>
              updatePreferences((prev) => ({ ...prev, androidSaveMode: mode }))
            }
            lastExportNotice={lastExportNotice}
            onDismissLastExportNotice={() => setLastExportNotice(null)}
            onDownloadFormatted={downloadFormattedSubtitles}
            onRefreshDownloadSession={refreshDownloadSession}
          />
        )}

        {activeTab === 'menu' && (
          <MenuSettingsTabView
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
            onResetPreferences={handleResetPreferences}
            onOpenOnScreenSliders={() => setIsOnScreenSlidersOpen(true)}
            focusedCategory={focusedSettingsCategory}
            focusedTranslationSub={focusedTranslationSub}
            translationSettings={translationSettings}
            onUpdateTranslationSettings={setTranslationSettings}
            selectedModel={selectedModel}
            onUpdateModel={(newModel) => {
              setSelectedModel(newModel);
              updateGeminiConfig(newModel);
            }}
            geminiApiKey={geminiApiKey}
            onUpdateGeminiApiKey={setGeminiApiKey}
            onApplyGeminiApiKey={(key) => { void handleApplyGeminiApiKey(key); }}
            googleApiKey={googleApiKey}
            onUpdateGoogleApiKey={setGoogleApiKey}
            isGeminiConnected={isGeminiConnected}
            geminiConnectStatus={geminiConnectStatus}
            googleConnectStatus={googleConnectStatus}
            onConnectGemini={() => { void connectGemini(); }}
            onUpdateGoogleConfig={() => { void updateGoogleConfig(); }}
            geminiWorkers={geminiWorkers}
            onUpdateGeminiWorkers={setGeminiWorkers}
            geminiBatchSize={geminiBatchSize}
            onUpdateGeminiBatchSize={setGeminiBatchSize}
            geminiDelay={geminiDelay}
            onUpdateGeminiDelay={setGeminiDelay}
            googleWorkers={googleWorkers}
            onUpdateGoogleWorkers={setGoogleWorkers}
            googleBatchSize={googleBatchSize}
            onUpdateGoogleBatchSize={setGoogleBatchSize}
            adaptiveScalingEnabled={adaptiveScalingEnabled}
            onToggleAdaptiveScaling={setAdaptiveScalingEnabled}
            storageBreakdown={storageBreakdown}
            onRefreshStorageStats={refreshDraftsAndStats}
            onDeleteDraftFromStorage={handleDeleteDraftFromStorage}
            onClearCrashSnapshotFromStorage={handleClearCrashSnapshotFromStorage}
            localFonts={localFonts}
            onDeleteLocalFont={handleDeleteLocalFontById}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onSaveCurrentDraftQuick={() => handleSaveCurrentAsDraft(fileName ? `${fileName} Draft` : `Quick Draft ${new Date().toLocaleTimeString()}`)}
            onClearAllDrafts={handleClearAllDrafts}
            onDiscardActiveProject={resetProject}
            onOpenCinemaStudio={() => setIsAiCinemaOpen(true)}
            onOpenEditStudio={() => handleOpenEditor()}
            hasActiveSubtitles={subtitles.length > 0}
            sessionId={sessionId}
          />
        )}

        {activeTab === 'workspace' && (
          <div id="subtitles-workspace" className="space-y-5 flex flex-col min-h-0">
            {/* Workspace */}
            <ResizableBox 
              title="Translation Workspace" 
              icon={Languages} 
              initialHeight={preferences.workspaceBoxHeight || 780} 
              minHeight={420} 
              maxHeight={2000}
              isFullScreen={isFullScreen}
              onFullScreenToggle={() => setIsFullScreen(!isFullScreen)}
              actions={
                <div className="flex items-center gap-1 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="min-h-[30px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 disabled:opacity-35 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 size={11} className="text-amber-500" />
                    <span className="hidden xs:inline">Undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="min-h-[30px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 disabled:opacity-35 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 size={11} className="text-emerald-500" />
                    <span className="hidden xs:inline">Redo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSplitAllLong}
                    disabled={subtitles.length === 0 || isReadOnly}
                    className="min-h-[30px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 disabled:opacity-35 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                    title="Divide all long subtitle blocks into short ≤2-line segments"
                  >
                    <Scissors size={11} style={{ color: 'var(--theme-accent)' }} />
                    <span>Split ≤2L</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditor()}
                    className="min-h-[30px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                    title="Open Clean Studio"
                  >
                    <Edit3 size={11} style={{ color: 'var(--theme-accent)' }} />
                    <span className="hidden sm:inline">Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWorkspaceDrawerOpen(true)}
                    className="min-h-[30px] px-2.5 rounded-md text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                    title="Workspace Tools & Utilities Drawer"
                  >
                    <Sliders size={11} />
                    <span>Tools</span>
                    {(selectedIndices.size > 0 || searchTerm || qcFilter !== 'all') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                    )}
                  </button>
                </div>
              }
          >
            <div className="flex flex-col h-full min-h-0">
              {!visibleColumns.original && !visibleColumns.ai && !visibleColumns.google && (
                <div className="px-3 py-2 border-b text-amber-500 text-xs flex items-center justify-between" style={{ borderColor: 'var(--theme-border)' }}>
                  <span>All text columns hidden.</span>
                  <button
                    type="button"
                    onClick={() => setVisibleColumns((prev) => ({ ...prev, original: true, ai: true, google: true }))}
                    className="px-2 py-0.5 rounded border border-amber-500/40 text-[10px] font-semibold cursor-pointer"
                  >
                    Show Columns
                  </button>
                </div>
              )}

              {/* Mobile Card Quick Bar (always shows Split ≤2L + multilingual stream switches) */}
              {useMobileCards && (
                <div
                  className="px-2.5 py-1.5 border-b flex flex-wrap items-center justify-between gap-1.5"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsWorkspaceDrawerOpen(true)}
                      className="px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 text-white cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-accent)' }}
                    >
                      <Sliders size={10} />
                      <span>Tools</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSplitAllLong}
                      disabled={subtitles.length === 0 || isReadOnly}
                      className="px-2 py-1 rounded-md border text-[10px] font-semibold flex items-center gap-1 disabled:opacity-35 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                      title="Divide all long subtitle blocks into ≤2 lines"
                    >
                      <Scissors size={10} style={{ color: 'var(--theme-accent)' }} />
                      <span>Split ≤2L</span>
                    </button>
                  </div>

                  {preferences.mobileSubtitleView === 'stream-switch' ? (
                    <div className="flex items-center gap-1 p-0.5 rounded-lg border" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                      {(
                        [
                          { id: 'ai', label: 'AI' },
                          { id: 'google', label: 'Neutral' },
                          { id: 'original', label: 'Orig' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setMobileFocusStream(st.id)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer',
                            mobileFocusStream === st.id ? 'text-white' : 'opacity-65'
                          )}
                          style={mobileFocusStream === st.id ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 p-0.5 rounded-lg border" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                      {(
                        [
                          { key: 'original', label: 'Orig' },
                          { key: 'ai', label: 'AI' },
                          { key: 'google', label: 'Neutral' },
                        ] as const
                      ).map((col) => {
                        const active = visibleColumns[col.key];
                        return (
                          <button
                            key={col.key}
                            type="button"
                            onClick={() =>
                              setVisibleColumns((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                            }
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer',
                              active ? 'text-white' : 'opacity-55'
                            )}
                            style={active ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                            title={`Switch ${col.label} stream`}
                          >
                            {col.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div
                className={cn(
                  'relative',
                  !isMobileViewport || isFullScreen
                    ? 'flex-1 min-h-0 overflow-auto'
                    : !useMobileCards
                    ? 'overflow-x-auto'
                    : ''
                )}
              >
                {useMobileCards ? (
                  <div className="p-2 space-y-2">
                    {filteredSubtitles.length === 0 ? (
                      <div className="py-8 px-4 text-center flex flex-col items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10" style={{ color: 'var(--theme-accent)' }}>
                          <FileText size={26} />
                        </div>
                        <p className="text-xs font-bold">No Subtitle Entries Loaded</p>
                        <p className="text-[11px] opacity-65 max-w-xs">
                          Load a file from device storage or import via URL on Home.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                          {!hasAnySubtitlesInApp && (
                            <button
                              type="button"
                              onClick={loadSampleSubtitles}
                              className="px-3 py-1.5 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              style={{ backgroundColor: 'var(--theme-accent)' }}
                            >
                              <Sparkles size={12} />
                              <span>Load Demo</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveTab('home')}
                            className="px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                          >
                            <Home size={12} />
                            <span>Home</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      progressiveWorkspaceSubtitles.map((item) => (
                        <div key={item.index} className="perf-row">
                          <MobileSubtitleCard
                            item={item}
                            viewMode={preferences.mobileSubtitleView}
                            focusStream={mobileFocusStream}
                            isSelected={selectedIndices.has(item.index)}
                            onToggleSelect={toggleSelectRow}
                            onOpenEditor={(idx) => handleOpenEditor(idx)}
                            onTranslateGoogle={translateSingleRowGoogle}
                            visibleColumns={visibleColumns}
                            originalFont={originalFont}
                            originalFontSize={originalFontSize}
                            urduFont={urduFont}
                            translatedFontSize={translatedFontSize}
                            googleFont={googleFont}
                            googleFontSize={googleFontSize}
                            isGlobalFontActive={isGlobalFontActive}
                            globalFont={globalFont}
                            globalFontSize={globalFontSize}
                            activeStylingConfig={activeStylingConfig}
                            isStylingPreviewActive={isWorkspaceStylingPreview}
                            isReadOnly={isReadOnly}
                            onEditOriginal={handleManualEditOriginal}
                            onEditTranslated={handleManualEdit}
                            onEditGoogle={handleManualEditGoogle}
                            onOpenWatermark={() => setIsWatermarkModalOpen(true)}
                            qcIssue={qcAnalysis.map.get(item.index)}
                            showQcBadges={preferences.optionalFeatures.enableQcInspector}
                            canUndoBlock={canUndoBlock(item.index)}
                            canRedoBlock={canRedoBlock(item.index)}
                            onUndoBlock={handleUndoBlock}
                            onRedoBlock={handleRedoBlock}
                            onLongPressField={(idx, field, pos) => setFieldActionMenu({ index: idx, field, x: pos.x, y: pos.y })}
                            onLongPressColumn={(field, pos) => setColumnHistoryMenu({ field, x: pos.x, y: pos.y })}
                            editTriggerTarget={editTriggerTarget}
                          />
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                <table className="w-max min-w-full text-left border-collapse">
                  <thead
                    className="sticky top-0 backdrop-blur-md z-20 border-b"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    <tr className="opacity-85">
                      <th
                        className="sticky left-0 z-30 p-1.5 text-[9px] font-semibold uppercase tracking-wider w-10 text-center border-r"
                        style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <input
                            type="checkbox"
                            checked={filteredSubtitles.length > 0 && selectedIndices.size === filteredSubtitles.length}
                            onChange={toggleSelectAll}
                            className="rounded cursor-pointer w-3 h-3"
                            title={selectedIndices.size > 0 ? 'Deselect all' : 'Select all'}
                          />
                          <span>#</span>
                        </div>
                      </th>
                      {visibleColumns.time && (
                        <th className="p-1.5 text-[9px] font-semibold uppercase tracking-wider w-28">
                          <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={studioColumnsToDisplay.time}
                              onChange={(e) => setStudioColumnsToDisplay((prev) => ({ ...prev, time: e.target.checked }))}
                              className="rounded cursor-pointer w-3 h-3"
                            />
                            <span>Time</span>
                          </label>
                        </th>
                      )}
                      {visibleColumns.original && (
                        <th
                          onTouchStart={(e) => startColHeaderLongPress(e, 'orig')}
                          onTouchMove={moveColHeaderLongPress}
                          onTouchEnd={clearColHeaderLongPress}
                          onTouchCancel={clearColHeaderLongPress}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setColumnHistoryMenu({ field: 'orig', x: e.clientX, y: e.clientY });
                          }}
                          className="p-1.5 text-[9px] font-semibold uppercase tracking-wider min-w-[200px]"
                          title="Long-press or right-click column for Original Undo/Redo"
                        >
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1">
                              <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={studioColumnsToDisplay.original}
                                  onChange={(e) => setStudioColumnsToDisplay((prev) => ({ ...prev, original: e.target.checked }))}
                                  className="rounded cursor-pointer w-3 h-3"
                                />
                                <span>Original</span>
                              </label>
                              <span className="font-mono opacity-60">
                                · {translationSettings.sourceLanguage === 'auto' ? 'Auto' : translationSettings.sourceLanguage.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setVisibleColumns((prev) => ({ ...prev, original: true, ai: false, google: false }))}
                                className="px-1.5 py-0.5 rounded border text-[8.5px] font-semibold cursor-pointer opacity-80 hover:opacity-100"
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                                title="Focus Original column only"
                              >
                                Solo
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditor(undefined, 'orig')}
                                className="px-1.5 py-0.5 rounded border text-[8.5px] font-semibold cursor-pointer"
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-accent)' }}
                                title="Edit Original stream in Studio"
                              >
                                Studio
                              </button>
                            </div>
                          </div>
                        </th>
                      )}
                      {visibleColumns.ai && (
                        <th
                          onTouchStart={(e) => startColHeaderLongPress(e, 'ai')}
                          onTouchMove={moveColHeaderLongPress}
                          onTouchEnd={clearColHeaderLongPress}
                          onTouchCancel={clearColHeaderLongPress}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setColumnHistoryMenu({ field: 'ai', x: e.clientX, y: e.clientY });
                          }}
                          className="p-1.5 text-[9px] font-semibold uppercase tracking-wider min-w-[220px]"
                          title="Long-press or right-click column for AI Translation Undo/Redo"
                        >
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1">
                              <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={studioColumnsToDisplay.ai}
                                  onChange={(e) => setStudioColumnsToDisplay((prev) => ({ ...prev, ai: e.target.checked }))}
                                  className="rounded cursor-pointer w-3 h-3"
                                />
                                <span>AI Translation</span>
                              </label>
                              <span className="font-mono opacity-65">
                                · {TARGET_LANGUAGES.find((l) => l.code === translationSettings.targetLanguage)?.name || 'Urdu'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setTranslationSettings((prev) => ({
                                    ...prev,
                                    scriptMode: prev.scriptMode === 'urdu-script' ? 'roman-urdu' : 'urdu-script',
                                  }))
                                }
                                className="px-1.5 py-0.5 rounded border text-[8.5px] font-semibold cursor-pointer"
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                                title="Switch script mode (Urdu / Roman)"
                              >
                                {SCRIPT_MODES.find((s) => s.id === translationSettings.scriptMode)?.badge || 'اردو'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setTranslationSettings((prev) => ({
                                    ...prev,
                                    scriptMode: prev.scriptMode.startsWith('bilingual') ? 'urdu-script' : 'bilingual-en-ur',
                                  }))
                                }
                                className={cn(
                                  'px-1.5 py-0.5 rounded border text-[8.5px] font-semibold cursor-pointer',
                                  translationSettings.scriptMode.startsWith('bilingual') && 'text-white'
                                )}
                                style={
                                  translationSettings.scriptMode.startsWith('bilingual')
                                    ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                                    : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                                }
                                title="Toggle Bilingual mode"
                              >
                                Bi
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditor(undefined, 'ai')}
                                className="px-1.5 py-0.5 rounded border text-[8.5px] font-semibold cursor-pointer"
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-accent)' }}
                                title="Edit AI stream in Studio"
                              >
                                Studio
                              </button>
                            </div>
                          </div>
                        </th>
                      )}
                      {visibleColumns.google && (
                        <th
                          onTouchStart={(e) => startColHeaderLongPress(e, 'google')}
                          onTouchMove={moveColHeaderLongPress}
                          onTouchEnd={clearColHeaderLongPress}
                          onTouchCancel={clearColHeaderLongPress}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setColumnHistoryMenu({ field: 'google', x: e.clientX, y: e.clientY });
                          }}
                          className="p-1.5 text-[9px] font-semibold uppercase tracking-wider min-w-[200px]"
                          title="Long-press or right-click column for Neutral/Google Undo/Redo"
                        >
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={studioColumnsToDisplay.google}
                                onChange={(e) => setStudioColumnsToDisplay((prev) => ({ ...prev, google: e.target.checked }))}
                                className="rounded cursor-pointer w-3 h-3"
                              />
                              <span>Neutral / Google</span>
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setVisibleColumns({ time: true, original: true, ai: true, google: true })}
                                className="px-1.5 py-0.5 rounded border text-[8.5px] font-semibold cursor-pointer opacity-80 hover:opacity-100"
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                                title="Show all columns"
                              >
                                All
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditor(undefined, 'google')}
                                className="px-1.5 py-0.5 rounded border text-[8.5px] font-semibold cursor-pointer"
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-accent)' }}
                                title="Edit Neutral stream in Studio"
                              >
                                Studio
                              </button>
                            </div>
                          </div>
                        </th>
                      )}
                      <th className="p-1.5 text-[9px] font-semibold uppercase tracking-wider w-16 text-center">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubtitles.length === 0 && (
                      <tr>
                        <td
                          colSpan={1 + (visibleColumns.time ? 1 : 0) + (visibleColumns.original ? 1 : 0) + (visibleColumns.ai ? 1 : 0) + (visibleColumns.google ? 1 : 0) + 1}
                          className="p-8 text-center"
                        >
                          <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                            <FileText size={24} style={{ color: 'var(--theme-accent)' }} />
                            <p className="text-xs font-semibold">No Subtitles Loaded</p>
                            <div className="flex items-center gap-2 mt-1">
                              {!hasAnySubtitlesInApp && (
                                <button
                                  type="button"
                                  onClick={loadSampleSubtitles}
                                  className="px-3 py-1.5 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  style={{ backgroundColor: 'var(--theme-accent)' }}
                                >
                                  <Sparkles size={12} />
                                  <span>Load Demo</span>
                                </button>
                              )}
                              <label
                                className="px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                              >
                                <Upload size={12} />
                                <span>Import</span>
                                <input type="file" accept=".srt,.vtt,.ass,.ssa,.sbv,.lrc,.json,.txt" onChange={handleFileUpload} className="hidden" />
                              </label>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {progressiveWorkspaceSubtitles.map((item) => (
                      <SubtitleRow
                        key={item.index}
                        item={item}
                        onOpenEditor={handleOpenEditor}
                        onTranslateGoogle={translateSingleRowGoogle}
                        isSelected={selectedIndices.has(item.index)}
                        onToggleSelect={toggleSelectRow}
                        visibleColumns={visibleColumns}
                        originalFont={originalFont}
                        originalFontSize={originalFontSize}
                        urduFont={urduFont}
                        translatedFontSize={translatedFontSize}
                        googleFont={googleFont}
                        googleFontSize={googleFontSize}
                        isGlobalFontActive={isGlobalFontActive}
                        globalFont={globalFont}
                        globalFontSize={globalFontSize}
                        activeStylingConfig={activeStylingConfig}
                        isStylingPreviewActive={isWorkspaceStylingPreview}
                        isReadOnly={isReadOnly}
                        onEditOriginal={handleManualEditOriginal}
                        onEditTranslated={handleManualEdit}
                        onEditGoogle={handleManualEditGoogle}
                        onOpenWatermark={() => setIsWatermarkModalOpen(true)}
                        canUndoBlock={canUndoBlock(item.index)}
                        canRedoBlock={canRedoBlock(item.index)}
                        onUndoBlock={handleUndoBlock}
                        onRedoBlock={handleRedoBlock}
                        onLongPressField={(idx, field, pos) => setFieldActionMenu({ index: idx, field, x: pos.x, y: pos.y })}
                        onLongPressColumn={(field, pos) => setColumnHistoryMenu({ field, x: pos.x, y: pos.y })}
                        editTriggerTarget={editTriggerTarget}
                      />
                    ))}
                  </tbody>
                </table>
                )}
              </div>
            </div>
          </ResizableBox>
          </div>
        )}
      </main>

      {/* Always-Pinned Workspace Viewport Footer (sits right above auto-hiding bottom nav; totally hidden when keyboard is active) */}
      {showWorkspacePinnedFooter && (
        <footer
          className={cn(
            'fixed inset-x-0 z-30 mobile-fixed-chrome border-t backdrop-blur-md px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] select-none tabular-nums transition-[bottom] duration-200 shadow-sm',
            isBottomNavVisible
              ? 'bottom-[calc(48px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-0'
              : 'bottom-0 pb-safe lg:bottom-0',
            isAnyOverlayOpen && 'pointer-events-none select-none'
          )}
          style={{
            backgroundColor: 'var(--theme-header)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text)',
          }}
        >
          <div className="opacity-75 font-medium">
            {pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1}–{pageSize === 0 ? filteredSubtitles.length : Math.min(currentPage * pageSize, filteredSubtitles.length)} / {filteredSubtitles.length}
            {searchTerm && <span className="ml-1" style={{ color: 'var(--theme-accent)' }}>(filtered)</span>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="opacity-60">Rows:</span>
              {[25, 50, 100, 0].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'px-1.5 py-0.5 rounded font-mono font-semibold cursor-pointer border',
                    pageSize === size ? 'text-white' : 'opacity-70'
                  )}
                  style={
                    pageSize === size
                      ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                      : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                  }
                >
                  {size === 0 ? 'All' : size}
                </button>
              ))}
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-0.5 rounded border disabled:opacity-30 cursor-pointer font-semibold btn-inch-cap"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                >
                  Prev
                </button>
                <span className="font-mono px-1 font-semibold">
                  {currentPage}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-0.5 rounded border disabled:opacity-30 cursor-pointer font-semibold btn-inch-cap"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* Mobile Bottom 6-Tab Navigation (auto-hides on downward scroll, shows on upward scroll, totally hidden when keyboard is active) */}
      {!isKeyboardActive && (
      <nav
        className={cn(
          'lg:hidden fixed bottom-0 inset-x-0 z-40 mobile-fixed-chrome backdrop-blur-md border-t px-1 pt-0.5 pb-safe grid grid-cols-6 items-center transition-transform duration-200',
          !isBottomNavVisible && 'translate-y-full pointer-events-none',
          isAnyOverlayOpen && 'pointer-events-none select-none'
        )}
        style={{
          backgroundColor: 'var(--theme-header)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)',
        }}
      >
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 py-1 min-h-[46px] min-w-0 text-[9.5px] font-semibold transition-colors cursor-pointer',
                isActive ? 'opacity-100' : 'opacity-55 hover:opacity-90'
              )}
              style={isActive ? { color: 'var(--theme-accent)' } : undefined}
            >
              {isActive && (
                <span
                  className="absolute top-0 w-7 h-[2px] rounded-full"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                />
              )}
              <div className="relative">
                {tab.id === 'translator' && (isTranslating || isGoogleTranslatingAll) ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Icon size={17} />
                )}
              </div>
              <span className="truncate max-w-full px-0.5">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
      )}

      {/* Translation Settings Modal */}
      <TranslationSettingsModal
        isOpen={isTranslationSettingsModalOpen}
        onClose={() => setIsTranslationSettingsModalOpen(false)}
        settings={translationSettings}
        onSave={(newSettings) => setTranslationSettings(newSettings)}
        urduFont={urduFont}
        onUpdateUrduFont={setUrduFont}
        originalFont={originalFont}
        onUpdateOriginalFont={setOriginalFont}
        onAddLog={addLog}
      />

      {/* Subtitle Stylizer & Gradient Modal */}
      <SubtitleStylizerModal
        isOpen={isStylizerOpen}
        onClose={() => setIsStylizerOpen(false)}
        subtitles={subtitles}
        onApply={(styledSubs) => {
          updateSubtitles(styledSubs);
          setHasAppliedCustomStyle(true);
          setIsWorkspaceStylingPreview(true);
        }}
        urduFont={urduFont}
        translatedFontSize={translatedFontSize}
        fileName={fileName}
        onAddLog={addLog}
      />

      {/* Find and Replace Modal */}
      <FindReplaceModal
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        subtitles={subtitles}
        selectedCount={selectedIndices.size}
        selectedIndices={selectedIndices}
        onApply={(updated, count) => {
          updateSubtitles(updated);
          addNotification(`Replaced ${count} occurrence(s)`, 'success');
        }}
        onAddLog={addLog}
      />

      {/* Batch Time Shift Modal */}
      <TimeShiftModal
        isOpen={isTimeShiftOpen}
        onClose={() => setIsTimeShiftOpen(false)}
        subtitles={subtitles}
        selectedCount={selectedIndices.size}
        selectedIndices={selectedIndices}
        onApply={(updated, shiftMs) => {
          updateSubtitles(updated);
          addNotification(`Shifted timestamps by ${shiftMs > 0 ? '+' : ''}${shiftMs}ms`, 'success');
        }}
        onAddLog={addLog}
      />

      {/* Time Gap Management & Snapping Modal */}
      <GapTimingModal
        isOpen={isGapTimingOpen}
        onClose={() => setIsGapTimingOpen(false)}
        subtitles={subtitles}
        selectedCount={selectedIndices.size}
        selectedIndices={selectedIndices}
        originalTimingMap={originalTimingMap}
        onApply={(updated, summary) => {
          updateSubtitles(updated);
        }}
        onResetToOriginal={handleResetTimingsToOriginal}
        onAddLog={addLog}
        onAddNotification={addNotification}
      />

      {/* Text Cleanup and Fixes Modal */}
      <TextCleanupModal
        isOpen={isTextCleanupOpen}
        onClose={() => setIsTextCleanupOpen(false)}
        subtitles={subtitles}
        selectedCount={selectedIndices.size}
        selectedIndices={selectedIndices}
        onApply={(updated) => {
          updateSubtitles(updated);
          addNotification('Text cleanup applied successfully', 'success');
        }}
        onAddLog={addLog}
      />

      {/* Watermark Modal */}
      <WatermarkModal
        isOpen={isWatermarkModalOpen}
        onClose={() => setIsWatermarkModalOpen(false)}
        subtitles={subtitles}
        onApplyWatermark={(updated) => {
          updateSubtitles(updated);
          addNotification("Watermark updated on first block!", "success");
        }}
        onAddLog={addLog}
      />

      {/* Dedicated Expanded Subtitle Editor Studio Modal */}
      <SubtitleEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => {
          setIsEditorModalOpen(false);
          setEditorFocusIndex(undefined);
          setEditorFocusStream(undefined);
        }}
        subtitles={subtitles}
        onUpdateSubtitles={updateSubtitles}
        initialFocusIndex={editorFocusIndex}
        initialFocusStream={editorFocusStream}
        fileName={fileName}
        detectedFormat={detectedFormat}
        urduFont={urduFont}
        originalFont={originalFont}
        googleFont={googleFont}
        isGlobalFontActive={isGlobalFontActive}
        globalFont={globalFont}
        globalFontSize={globalFontSize}
        translatedFontSize={translatedFontSize}
        originalFontSize={originalFontSize}
        googleFontSize={googleFontSize}
        translationSettings={translationSettings}
        onOpenTranslationSettings={() => setIsTranslationSettingsModalOpen(true)}
        onOpenStylizer={() => setIsStylingDrawerOpen(true)}
        onOpenStylingStudio={() => setIsStylingDrawerOpen(true)}
        activeStylingConfig={activeStylingConfig}
        isStylingPreviewActive={isWorkspaceStylingPreview}
        onTranslateGoogle={translateSingleRowGoogle}
        onApplyGoogleToAI={applyGoogleToAI}
        onRetrySelectedAI={retrySelectedAI}
        onRetrySelectedGoogle={retrySelectedGoogle}
        onRetrySelectedBoth={retrySelectedBoth}
        onClearSelectedTranslations={clearSelectedTranslations}
        onOpenFindReplace={() => setIsFindReplaceOpen(true)}
        onOpenTimeShift={() => setIsTimeShiftOpen(true)}
        onOpenGapTiming={() => setIsGapTimingOpen(true)}
        onOpenTextCleanup={() => setIsTextCleanupOpen(true)}
        onCopyAllGoogleToEmptyAI={copyAllGoogleToEmptyAI}
        isTranslating={isTranslating}
        isGoogleTranslatingAll={isGoogleTranslatingAll}
        onAddNotification={addNotification}
        onAddLog={addLog}
        onLoadSampleSubtitles={loadSampleSubtitles}
        hasAnySubtitlesInApp={hasAnySubtitlesInApp}
        onFileUpload={handleFileUpload}
        editorColumns={studioColumnsToDisplay}
        onUpdateEditorColumns={setStudioColumnsToDisplay}
      />

      {/* AI Cinema Studio Drawer (Launched from Home More Tools & Menu) */}
      <AiCinemaDrawer
        isOpen={isAiCinemaOpen}
        onClose={() => setIsAiCinemaOpen(false)}
        geminiService={geminiRef.current}
        isGeminiConnected={isGeminiConnected}
        onApplyContext={(contextText) => {
          setContext(contextText);
          addNotification("Applied AI Cinema context to subtitle workspace", "success");
        }}
        onAddLog={addLog}
        onAddNotification={addNotification}
      />

      {/* Styling Studio Drawer (Auto-bakes on close if styling changes are pending) */}
      <StylingStudioDrawer
        isOpen={isStylingDrawerOpen}
        onClose={() => {
          setIsStylingDrawerOpen(false);
          if (hasPendingStyleBake && subtitles.length > 0) {
            handleBakeAllStyles(true);
          }
        }}
        subtitles={subtitles}
        onApply={(styledSubtitles) => {
          updateSubtitles(styledSubtitles);
          setHasAppliedCustomStyle(true);
          setIsWorkspaceStylingPreview(true);
          setHasPendingStyleBake(false);
          addNotification("Applied stylized subtitle configuration to Translation Workspace", "saved");
        }}
        urduFont={urduFont}
        onUpdateUrduFont={(f) => { setUrduFont(f); setHasPendingStyleBake(true); }}
        originalFont={originalFont}
        onUpdateOriginalFont={(f) => { setOriginalFont(f); setHasPendingStyleBake(true); }}
        translatedFontSize={translatedFontSize}
        onUpdateTranslatedFontSize={(s) => { setTranslatedFontSize(s); setHasPendingStyleBake(true); }}
        originalFontSize={originalFontSize}
        onUpdateOriginalFontSize={(s) => { setOriginalFontSize(s); setHasPendingStyleBake(true); }}
        fileName={fileName}
        activeStylingConfig={activeStylingConfig}
        onUpdateActiveStyling={(newConfig) => {
          setActiveStylingConfig(newConfig);
          setHasAppliedCustomStyle(true);
          setIsWorkspaceStylingPreview(true);
          setHasPendingStyleBake(true);
        }}
        onAddLog={addLog}
        onAddNotification={addNotification}
      />

      {/* Interactive Subtitle Playback & Preview Space */}
      <SubtitlePreviewSpaceModal
        isOpen={isPreviewSpaceOpen}
        onClose={() => setIsPreviewSpaceOpen(false)}
        subtitles={subtitles}
        urduFont={urduFont}
        translatedFontSize={translatedFontSize}
        fileName={fileName}
        activeStylingConfig={activeStylingConfig}
      />

      {/* Unified Google Translate Settings Modal */}
      <GoogleTranslateSettingsModal
        isOpen={isGoogleSettingsOpen}
        onClose={() => setIsGoogleSettingsOpen(false)}
        googleApiKey={googleApiKey}
        onUpdateGoogleApiKey={setGoogleApiKey}
        translationSettings={translationSettings}
        onUpdateTranslationSettings={setTranslationSettings}
        googleWorkers={googleWorkers}
        onUpdateGoogleWorkers={setGoogleWorkers}
        googleBatchSize={googleBatchSize}
        onUpdateGoogleBatchSize={setGoogleBatchSize}
        onTestConnection={updateGoogleConfig}
        testStatus={googleConnectStatus}
        onAddLog={addLog}
        onAddNotification={addNotification}
      />

      {/* Unified AI Configuration Modal */}
      <AiConfigModal
        isOpen={isAiConfigOpen}
        onClose={() => setIsAiConfigOpen(false)}
        selectedModel={selectedModel}
        onUpdateModel={(newModel) => {
          setSelectedModel(newModel);
          updateGeminiConfig(newModel);
        }}
        onConnectGemini={connectGemini}
        connectStatus={geminiConnectStatus}
        isGeminiConnected={isGeminiConnected}
        geminiWorkers={geminiWorkers}
        onUpdateWorkers={setGeminiWorkers}
        geminiBatchSize={geminiBatchSize}
        onUpdateBatchSize={setGeminiBatchSize}
        geminiDelay={geminiDelay}
        onUpdateDelay={setGeminiDelay}
        adaptiveScalingEnabled={adaptiveScalingEnabled}
        onToggleAdaptiveScaling={setAdaptiveScalingEnabled}
        onAddLog={addLog}
        onAddNotification={addNotification}
      />

      {/* Unified Download Modal (All Formats & Streams) */}
      <UnifiedDownloadModal
        isOpen={isUnifiedDownloadOpen}
        onClose={() => setIsUnifiedDownloadOpen(false)}
        subtitles={subtitles}
        onDownloadFormatted={downloadFormattedSubtitles}
        fileName={fileName}
      />

      {/* Subtle Right-Edge Swipe Zone (slide left from screen edge to open active tab drawer) */}
      {hasActiveDrawerForTab && !isCurrentTabDrawerOpen && !isAnyOverlayOpen && !isKeyboardActive && (
        <div
          aria-hidden="true"
          className="fixed right-0 top-[52px] bottom-[62px] lg:bottom-0 w-4 z-[55]"
          style={{ touchAction: 'pan-y' }}
        />
      )}

      {/* Exclusive Floating Bottom-Right Controls per Tab (hidden during keyboard input or open overlay) */}
      {activeTab === 'home' && !isHomeDrawerOpen && !isKeyboardActive && (
        <button
          type="button"
          onClick={() => setIsHomeDrawerOpen(true)}
          className={cn(
            'fixed right-3.5 sm:right-5 z-[60] h-11 min-w-[46px] px-3.5 rounded-2xl border shadow-lg flex items-center justify-center gap-1.5 cursor-pointer touch-tactile transition-[bottom] duration-200 btn-inch-cap',
            isBottomNavVisible
              ? 'bottom-[calc(54px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-5'
              : 'bottom-[calc(14px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-5',
            isAnyOverlayOpen && 'pointer-events-none select-none'
          )}
          style={{
            backgroundColor: 'var(--theme-accent)',
            borderColor: 'rgba(255,255,255,0.18)',
            color: '#ffffff',
          }}
          title="Open My Subtitles Folder Drawer (or swipe left from right edge)"
          aria-label="Open My Subtitles Folder Drawer"
        >
          <FolderPlus size={16} className="shrink-0" />
          <span className="text-[11px] font-semibold tracking-tight leading-none truncate">Files</span>
        </button>
      )}

      {/* Translator Tab: Horizontal Equal-Sized Action Row with Glowing Perimeter Progress Borders */}
      {activeTab === 'translator' && !isKeyboardActive && (
        <div
          className={cn(
            'fixed right-3.5 sm:right-5 left-3.5 sm:left-auto z-[60] flex flex-row items-center justify-end gap-4 sm:gap-5 max-w-[calc(100vw-28px)] overflow-x-auto no-scrollbar py-1 px-0.5 transition-[bottom] duration-200',
            isBottomNavVisible
              ? 'bottom-[calc(54px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-5'
              : 'bottom-[calc(14px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-5',
            isAnyOverlayOpen && 'pointer-events-none select-none'
          )}
        >
          {isTranslating && (
            <GlowingProgressButton
              variant="danger"
              progress={stats.progress}
              isActive
              onClick={requestStopTranslation}
              ariaLabel="Stop AI translation"
              title="Pause or Stop AI Translation"
              icon={<Square size={14} />}
              label="Stop AI"
            />
          )}

          <GlowingProgressButton
            variant="ai"
            progress={stats.progress}
            isActive={isTranslating}
            disabled={isTranslating || stats.total === 0}
            onClick={startTranslation}
            title={
              isTranslating
                ? `AI Dubbing (${translationSpeed}/s · ${stats.progress}%)`
                : stats.total > 0 && stats.translated === stats.total
                ? 'AI Translation Completed'
                : stats.translated > 0
                ? `Resume AI Dub (${stats.progress}%)`
                : 'Start AI Dub'
            }
            icon={
              isTranslating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : stats.total > 0 && stats.translated === stats.total ? (
                <CheckCircle2 size={15} />
              ) : (
                <Sparkles size={15} />
              )
            }
            label={
              isTranslating
                ? `AI ${stats.progress}%`
                : stats.total > 0 && stats.translated === stats.total
                ? 'AI Done'
                : stats.translated > 0
                ? `AI ${stats.progress}%`
                : 'AI Dub'
            }
          />

          {isGoogleTranslatingAll && (
            <GlowingProgressButton
              variant="danger"
              progress={stats.googleProgress}
              isActive
              onClick={requestStopGoogleTranslate}
              ariaLabel="Stop Neutral translation"
              title="Pause or Stop Neutral Translation"
              icon={<Square size={14} />}
              label="Stop N"
            />
          )}

          <GlowingProgressButton
            variant="neutral"
            progress={stats.googleProgress}
            isActive={isGoogleTranslatingAll}
            disabled={isGoogleTranslatingAll || stats.total === 0}
            onClick={translateAllGoogle}
            title={
              isGoogleTranslatingAll
                ? `Neutral Translating (${stats.googleProgress}%)`
                : stats.total > 0 && stats.google === stats.total
                ? 'Neutral / Google Translation Completed'
                : 'Run Neutral / Google Translate'
            }
            icon={
              isGoogleTranslatingAll ? (
                <Loader2 size={15} className="animate-spin" />
              ) : stats.total > 0 && stats.google === stats.total ? (
                <CheckCircle2 size={15} />
              ) : (
                <Languages size={15} />
              )
            }
            label={
              isGoogleTranslatingAll
                ? `Neutral ${stats.googleProgress}%`
                : stats.total > 0 && stats.google === stats.total
                ? 'Neutral Done'
                : stats.google > 0
                ? `Neutral ${stats.googleProgress}%`
                : 'Neutral'
            }
          />
        </div>
      )}

      {activeTab === 'workspace' && !isWorkspaceDrawerOpen && !isKeyboardActive && (
        <button
          type="button"
          onClick={() => setIsWorkspaceDrawerOpen(true)}
          className={cn(
            'fixed right-3.5 sm:right-5 z-[60] h-11 min-w-[46px] px-3.5 rounded-2xl border shadow-lg flex items-center justify-center gap-1.5 cursor-pointer touch-tactile transition-[bottom] duration-200 btn-inch-cap',
            showWorkspacePinnedFooter
              ? isBottomNavVisible
                ? 'bottom-[calc(108px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-[58px]'
                : 'bottom-[calc(58px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-[58px]'
              : isBottomNavVisible
              ? 'bottom-[calc(54px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-5'
              : 'bottom-[calc(14px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-5',
            isAnyOverlayOpen && 'pointer-events-none select-none'
          )}
          style={{
            backgroundColor: 'var(--theme-accent)',
            borderColor: 'rgba(255,255,255,0.18)',
            color: '#ffffff',
          }}
          title="Open Workspace Tools Drawer (or swipe left from right edge)"
          aria-label="Open Workspace Tools Drawer"
        >
          <Sliders size={15} className="shrink-0" />
          <span className="text-[11px] font-semibold tracking-tight leading-none truncate">Tools</span>
          {(selectedIndices.size > 0 || searchTerm || qcFilter !== 'all') && (
            <span className="w-1.5 h-1.5 rounded-full bg-white/95 shrink-0" />
          )}
        </button>
      )}

      {activeTab === 'styling' && !isStylingDrawerOpen && !isKeyboardActive && (
        <button
          type="button"
          onClick={() => setIsStylingDrawerOpen(true)}
          className={cn(
            'fixed right-3.5 sm:right-5 z-[60] h-11 min-w-[46px] px-3.5 rounded-2xl border shadow-lg flex items-center justify-center gap-1.5 cursor-pointer touch-tactile transition-[bottom] duration-200 btn-inch-cap',
            isBottomNavVisible
              ? 'bottom-[calc(54px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-5'
              : 'bottom-[calc(14px+max(env(safe-area-inset-bottom,0px),6px))] lg:bottom-5',
            isAnyOverlayOpen && 'pointer-events-none select-none'
          )}
          style={{
            backgroundColor: 'var(--theme-accent)',
            borderColor: 'rgba(255,255,255,0.18)',
            color: '#ffffff',
          }}
          title="Open Gradient Studio Drawer (or swipe left from right edge)"
          aria-label="Open Gradient Studio Drawer"
        >
          <Palette size={15} className="shrink-0" />
          <span className="text-[11px] font-semibold tracking-tight leading-none truncate">Gradient</span>
        </button>
      )}

      {/* Home Tab Exclusive Right-Side Drawer (My Subtitles Folder) */}
      <MySubtitlesDrawer
        isOpen={activeTab === 'home' && isHomeDrawerOpen}
        onClose={() => setIsHomeDrawerOpen(false)}
        onLoadFile={processSubtitleFile}
        onNotify={addNotification}
      />

      {/* Translator Tab Exclusive Right-Side Drawer (Swipe Left from Right Edge) */}
      <TranslatorDrawer
        isOpen={activeTab === 'translator' && isTranslatorDrawerOpen}
        onClose={() => setIsTranslatorDrawerOpen(false)}
        subtitlesCount={stats.total}
        translatedCount={stats.translated}
        googleCount={stats.google}
        isTranslating={isTranslating}
        isGoogleTranslatingAll={isGoogleTranslatingAll}
        translationSpeed={translationSpeed}
        selectedModel={selectedModel}
        onUpdateModel={(newModel) => {
          setSelectedModel(newModel);
          updateGeminiConfig(newModel);
        }}
        geminiWorkers={geminiWorkers}
        onUpdateGeminiWorkers={setGeminiWorkers}
        geminiBatchSize={geminiBatchSize}
        onUpdateGeminiBatchSize={setGeminiBatchSize}
        geminiDelay={geminiDelay}
        onUpdateGeminiDelay={setGeminiDelay}
        googleWorkers={googleWorkers}
        onUpdateGoogleWorkers={setGoogleWorkers}
        googleBatchSize={googleBatchSize}
        onUpdateGoogleBatchSize={setGoogleBatchSize}
        adaptiveScalingEnabled={adaptiveScalingEnabled}
        onToggleAdaptiveScaling={setAdaptiveScalingEnabled}
        activeAdaptiveInfo={activeAdaptiveInfo}
        workerStates={workerStates}
        translationSettings={translationSettings}
        onUpdateTranslationSettings={setTranslationSettings}
        onStartTranslation={startTranslation}
        onStopTranslation={requestStopTranslation}
        onStartGoogleTranslate={translateAllGoogle}
        onStopGoogleTranslate={requestStopGoogleTranslate}
        onOpenFullSettings={() => {
          setFocusedSettingsCategory('translation');
          setFocusedTranslationSub('language');
          setActiveTab('menu');
        }}
      />

      {/* Workspace Tab Exclusive Right-Side Drawer (All Workspace Tools & Utilities) */}
      <WorkspaceDrawer
        isOpen={activeTab === 'workspace' && isWorkspaceDrawerOpen}
        onClose={() => setIsWorkspaceDrawerOpen(false)}
        searchInput={searchInput}
        onChangeSearch={setSearchInput}
        isReadOnly={isReadOnly}
        onToggleReadOnly={() => {
          const next = !isReadOnly;
          setIsReadOnly(next);
          addNotification(next ? 'Locked' : 'Unlocked', 'success');
          addLog(next ? 'Locked workspace.' : 'Unlocked workspace editing.', 'info');
        }}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        historyIndex={historyIndex}
        historyLength={history.length}
        onUndo={handleUndo}
        onRedo={handleRedo}
        filteredCount={filteredSubtitles.length}
        selectedCount={selectedIndices.size}
        untranslatedCount={Math.max(0, stats.total - stats.translated)}
        onToggleSelectAll={toggleSelectAll}
        onSelectUntranslated={selectUntranslated}
        onClearSelection={() => setSelectedIndices(new Set())}
        onOpenEditor={() => handleOpenEditor()}
        onRetrySelectedAI={retrySelectedAI}
        onRetrySelectedGoogle={retrySelectedGoogle}
        onRetrySelectedBoth={retrySelectedBoth}
        onClearSelectedAI={confirmClearSelectedAI}
        onClearSelectedGoogle={confirmClearSelectedGoogle}
        onClearSelectedBoth={confirmClearSelectedBoth}
        onDeleteSelected={confirmDeleteSelectedSubtitles}
        isTranslating={isTranslating}
        isGoogleTranslatingAll={isGoogleTranslatingAll}
        onOpenFindReplace={() => setIsFindReplaceOpen(true)}
        onOpenTextCleanup={() => setIsTextCleanupOpen(true)}
        onSplitAllLong={handleSplitAllLong}
        onOpenWatermark={() => setIsWatermarkModalOpen(true)}
        onAddSegment={() => handleInsertSubtitle()}
        onOpenTimeShift={() => setIsTimeShiftOpen(true)}
        onOpenGapTiming={() => setIsGapTimingOpen(true)}
        onResetTimings={confirmResetTimings}
        onResetBaseline={confirmResetBaseline}
        onRefreshTable={() => setSubtitles([...subtitles])}
        viewMode={preferences.mobileSubtitleView}
        onChangeViewMode={(mode) =>
          updatePreferences((prev) => ({ ...prev, mobileSubtitleView: mode }))
        }
        visibleColumns={visibleColumns}
        onChangeVisibleColumns={setVisibleColumns}
        onOpenTextResize={() => {
          setDraftOriginalFontSize(originalFontSize);
          setDraftTranslatedFontSize(translatedFontSize);
          setDraftGoogleFontSize(googleFontSize);
          setDraftGlobalFontSize(globalFontSize);
          setIsTextResizeOpen(true);
          setIsFontsOpen(false);
        }}
        onOpenFonts={() => {
          setDraftOriginalFont(originalFont);
          setDraftUrduFont(urduFont);
          setDraftGoogleFont(googleFont);
          setDraftGlobalFont(globalFont);
          setDraftIsGlobalFontActive(isGlobalFontActive);
          setDraftFontTarget(fontTarget);
          setIsFontsOpen(true);
          setIsTextResizeOpen(false);
        }}
        onOpenLanguageSettings={() => {
          setFocusedSettingsCategory('translation');
          setFocusedTranslationSub('language');
          setActiveTab('menu');
        }}
        scriptBadge={SCRIPT_MODES.find((s) => s.id === translationSettings.scriptMode)?.badge || 'اردو'}
        aiProgress={stats.progress}
        googleProgress={stats.googleProgress}
        onToggleWorkerMonitor={() => setIsWorkerMonitorOpen((prev) => !prev)}
        enableQcInspector={preferences.optionalFeatures.enableQcInspector}
        qcFilter={qcFilter}
        onChangeQcFilter={(next) => {
          setQcFilter(next);
          setCurrentPage(1);
        }}
        qcCounts={{
          total: subtitles.length,
          totalIssues: qcAnalysis.totalIssues,
          highCpsCount: qcAnalysis.highCpsCount,
          overlapCount: qcAnalysis.overlapCount,
          untranslatedCount: qcAnalysis.untranslatedCount,
        }}
      />

      {/* Clutter-Free Text Resize Popup */}
      <TextResizePopupModal
        isOpen={isTextResizeOpen}
        onClose={handleCancelTextResize}
        onApply={handleApplyTextResize}
        onResetDraft={() => {
          setDraftOriginalFontSize(originalFontSize);
          setDraftTranslatedFontSize(translatedFontSize);
          setDraftGoogleFontSize(googleFontSize);
          setDraftGlobalFontSize(globalFontSize);
        }}
        isDirty={
          draftOriginalFontSize !== originalFontSize ||
          draftTranslatedFontSize !== translatedFontSize ||
          draftGoogleFontSize !== googleFontSize ||
          draftGlobalFontSize !== globalFontSize
        }
        draftOriginalFontSize={draftOriginalFontSize}
        draftTranslatedFontSize={draftTranslatedFontSize}
        draftGoogleFontSize={draftGoogleFontSize}
        draftGlobalFontSize={draftGlobalFontSize}
        onChangeOriginalFontSize={setDraftOriginalFontSize}
        onChangeTranslatedFontSize={setDraftTranslatedFontSize}
        onChangeGoogleFontSize={setDraftGoogleFontSize}
        onChangeGlobalFontSize={setDraftGlobalFontSize}
        onSyncAllSizes={(val) => {
          setDraftGlobalFontSize(val);
          setDraftOriginalFontSize(val);
          setDraftTranslatedFontSize(val);
          setDraftGoogleFontSize(val);
        }}
        previewDisplayMode={previewDisplayMode}
        onTogglePreviewDisplayMode={() =>
          setPreviewDisplayMode((m) => (m === 'rendered' ? 'plain' : 'rendered'))
        }
        activeOriginalFont={isGlobalFontActive ? globalFont : originalFont}
        activeAiFont={isGlobalFontActive ? globalFont : urduFont}
        activeGoogleFont={isGlobalFontActive ? globalFont : googleFont}
        previewSource={previewSource}
        previewAi={previewAi}
        previewGoogle={previewGoogle}
      />

      {/* Clutter-Free Fonts Picker Popup */}
      <FontsPopupModal
        isOpen={isFontsOpen}
        onClose={handleCancelFonts}
        onApply={handleApplyFonts}
        onResetDraft={() => {
          setDraftOriginalFont(originalFont);
          setDraftUrduFont(urduFont);
          setDraftGoogleFont(googleFont);
          setDraftGlobalFont(globalFont);
          setDraftIsGlobalFontActive(isGlobalFontActive);
          setDraftFontTarget(fontTarget);
        }}
        isDirty={
          draftOriginalFont !== originalFont ||
          draftUrduFont !== urduFont ||
          draftGoogleFont !== googleFont ||
          draftGlobalFont !== globalFont ||
          draftIsGlobalFontActive !== isGlobalFontActive ||
          draftFontTarget !== fontTarget
        }
        draftFontTarget={draftFontTarget}
        onChangeDraftFontTarget={setDraftFontTarget}
        fontsActiveTab={fontsActiveTab}
        onChangeFontsActiveTab={setFontsActiveTab}
        draftOriginalFont={draftOriginalFont}
        draftUrduFont={draftUrduFont}
        draftGoogleFont={draftGoogleFont}
        draftGlobalFont={draftGlobalFont}
        draftIsGlobalFontActive={draftIsGlobalFontActive}
        onSelectFont={applyFontSelectionDraft}
        localFonts={localFonts}
        customFontInputName={customFontInputName}
        onChangeCustomFontInputName={setCustomFontInputName}
        onAddNamedFont={handleAddNamedFont}
        onUploadFontFile={handleUploadFontFile}
        onDeleteLocalFont={handleDeleteLocalFont}
        isUploadingFont={isUploadingFont}
        previewSource={previewSource}
        previewAi={previewAi}
        previewGoogle={previewGoogle}
      />

      {/* Field Long-Click Actions Popup Menu */}
      {fieldActionMenu && (() => {
        const targetSub = subtitles.find(s => s.index === fieldActionMenu.index);
        if (!targetSub) return null;
        const fieldText =
          fieldActionMenu.field === 'orig'
            ? targetSub.text
            : fieldActionMenu.field === 'ai'
            ? targetSub.translatedText || ''
            : targetSub.googleTranslateText || '';
        const fieldLabel =
          fieldActionMenu.field === 'orig'
            ? 'Original'
            : fieldActionMenu.field === 'ai'
            ? 'AI Translation'
            : 'Neutral / Google';
        const menuStyle = getClampedPopoverStyle({ left: fieldActionMenu.x, top: fieldActionMenu.y }, 224, 340);
        return (
          <div
            className="fixed inset-0 z-[240]"
            onClick={() => setFieldActionMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setFieldActionMenu(null);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[245] w-[224px] rounded-xl border shadow-2xl p-1.5 space-y-0.5 text-[11px]"
              style={{
                ...menuStyle,
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            >
              <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider opacity-60 border-b mb-1 flex items-center justify-between" style={{ borderColor: 'var(--theme-border)' }}>
                <span>Block #{targetSub.index} · {fieldLabel}</span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const m = fieldActionMenu;
                    setFieldActionMenu(null);
                    setEditTriggerTarget({ index: m.index, field: m.field, nonce: Date.now() });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 hover:bg-white/10 cursor-pointer"
                >
                  <Edit3 size={12} style={{ color: 'var(--theme-accent)' }} />
                  <span>Inline Edit</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const m = fieldActionMenu;
                  setFieldActionMenu(null);
                  handleOpenEditor(m.index, m.field);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 hover:bg-white/10 cursor-pointer"
              >
                <Maximize2 size={12} style={{ color: 'var(--theme-accent)' }} />
                <span>Edit in Studio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(stripFormatting(fieldText));
                  addNotification(`Copied ${fieldLabel} #${targetSub.index}`, 'success');
                  setFieldActionMenu(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 hover:bg-white/10 cursor-pointer"
              >
                <Copy size={12} />
                <span>Copy</span>
              </button>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={async () => {
                    const m = fieldActionMenu;
                    setFieldActionMenu(null);
                    try {
                      const clip = await navigator.clipboard.readText();
                      if (clip === undefined || clip === null) return;
                      if (m.field === 'orig') handleManualEditOriginal(m.index, clip);
                      else if (m.field === 'ai') handleManualEdit(m.index, clip);
                      else handleManualEditGoogle(m.index, clip);
                      addNotification(`Pasted into ${fieldLabel} #${m.index}`, 'success');
                    } catch {
                      addNotification('Clipboard paste permission denied by browser', 'error');
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 hover:bg-white/10 cursor-pointer"
                >
                  <ClipboardPaste size={12} />
                  <span>Paste</span>
                </button>
              )}
              {!isReadOnly && fieldText && (
                <button
                  type="button"
                  onClick={() => {
                    const m = fieldActionMenu;
                    navigator.clipboard?.writeText(stripFormatting(fieldText));
                    setFieldActionMenu(null);
                    if (m.field === 'orig') handleManualEditOriginal(m.index, '');
                    else if (m.field === 'ai') handleManualEdit(m.index, '');
                    else handleManualEditGoogle(m.index, '');
                    addNotification(`Cut ${fieldLabel} #${m.index}`, 'success');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 hover:bg-white/10 cursor-pointer"
                >
                  <Scissors size={12} />
                  <span>Cut</span>
                </button>
              )}
              {(fieldActionMenu.field === 'orig' || fieldActionMenu.field === 'google') && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = fieldActionMenu.index;
                    setFieldActionMenu(null);
                    translateSingleRowGoogle(idx);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 hover:bg-white/10 cursor-pointer"
                >
                  <Languages size={12} style={{ color: 'var(--theme-accent)' }} />
                  <span>Neutral Translate</span>
                </button>
              )}
              {!isReadOnly && targetSub.googleTranslateText && fieldActionMenu.field !== 'orig' && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = fieldActionMenu.index;
                    setFieldActionMenu(null);
                    applyGoogleToAI(idx);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 hover:bg-white/10 cursor-pointer"
                >
                  <Sparkles size={12} style={{ color: 'var(--theme-accent)' }} />
                  <span>Use Neutral as AI</span>
                </button>
              )}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = fieldActionMenu.index;
                    setFieldActionMenu(null);
                    handleSplitSubtitle(idx);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 hover:bg-white/10 cursor-pointer"
                >
                  <Scissors size={12} />
                  <span>Split Block</span>
                </button>
              )}
              {(canUndoBlock(targetSub.index) || canRedoBlock(targetSub.index)) && (
                <div className="flex items-center gap-1 pt-1 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                  <button
                    type="button"
                    disabled={!canUndoBlock(targetSub.index)}
                    onClick={() => {
                      const idx = targetSub.index;
                      setFieldActionMenu(null);
                      handleUndoBlock(idx);
                    }}
                    className="flex-1 px-2 py-1 rounded-lg border text-[10.5px] font-semibold flex items-center justify-center gap-1 disabled:opacity-35 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    <Undo2 size={11} />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canRedoBlock(targetSub.index)}
                    onClick={() => {
                      const idx = targetSub.index;
                      setFieldActionMenu(null);
                      handleRedoBlock(idx);
                    }}
                    className="flex-1 px-2 py-1 rounded-lg border text-[10.5px] font-semibold flex items-center justify-center gap-1 disabled:opacity-35 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                  >
                    <Redo2 size={11} />
                    <span>Redo</span>
                  </button>
                </div>
              )}
              {!isReadOnly && fieldText && (
                <button
                  type="button"
                  onClick={() => {
                    const m = fieldActionMenu;
                    setFieldActionMenu(null);
                    confirmClearSingleField(m.index, m.field);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left font-medium flex items-center gap-2 text-red-400 hover:bg-red-500/15 cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Clear Field</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Column Stream Undo/Redo Popup Menu (long-press anywhere in column) */}
      {columnHistoryMenu && (() => {
        const label =
          columnHistoryMenu.field === 'orig'
            ? 'Original Stream'
            : columnHistoryMenu.field === 'ai'
            ? 'AI Translation Stream'
            : 'Neutral / Google Stream';
        const menuStyle = getClampedPopoverStyle({ left: columnHistoryMenu.x, top: columnHistoryMenu.y }, 224, 170);
        return (
          <div
            className="fixed inset-0 z-[240]"
            onClick={() => setColumnHistoryMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setColumnHistoryMenu(null);
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[245] w-[224px] rounded-xl border shadow-2xl p-2 space-y-1.5 text-[11px]"
              style={{
                ...menuStyle,
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            >
              <div className="px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider opacity-65 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                {label}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!canUndoStream(columnHistoryMenu.field)}
                  onClick={() => {
                    const f = columnHistoryMenu.field;
                    setColumnHistoryMenu(null);
                    handleUndoStream(f);
                  }}
                  className="flex-1 px-2 py-1.5 rounded-lg border font-semibold flex items-center justify-center gap-1 disabled:opacity-35 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  <Undo2 size={12} className="text-amber-500" />
                  <span>Undo</span>
                </button>
                <button
                  type="button"
                  disabled={!canRedoStream(columnHistoryMenu.field)}
                  onClick={() => {
                    const f = columnHistoryMenu.field;
                    setColumnHistoryMenu(null);
                    handleRedoStream(f);
                  }}
                  className="flex-1 px-2 py-1.5 rounded-lg border font-semibold flex items-center justify-center gap-1 disabled:opacity-35 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  <Redo2 size={12} className="text-emerald-500" />
                  <span>Redo</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const f = columnHistoryMenu.field;
                  setColumnHistoryMenu(null);
                  handleOpenEditor(undefined, f);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-accent)' }}
              >
                <Edit3 size={12} />
                <span>Open Stream in Studio</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* First-Launch Android Permissions & Export Folder Setup Modal */}
      {isAndroidSetupModalOpen && (
        <div
          className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => {
            try { localStorage.setItem('urdu_localizer_android_setup_done', '1'); } catch {}
            setIsAndroidSetupModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <Shield size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                <h3 className="text-sm font-semibold truncate">Android Storage &amp; Folder Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.setItem('urdu_localizer_android_setup_done', '1'); } catch {}
                  setIsAndroidSetupModalOpen(false);
                }}
                className="w-8 h-8 rounded-lg border flex items-center justify-center opacity-75 hover:opacity-100 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                aria-label="Close setup"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="opacity-85 leading-relaxed">
                To import subtitle files and save exported `.srt` / `.ass` files where you can easily find them, grant storage access and pick your default Export Folder (for example, <span className="font-semibold">Downloads</span>).
              </p>

              <div className="rounded-xl border p-2.5 space-y-1.5 text-[11px]" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="opacity-70">Runtime Storage</span>
                  <span className="font-mono font-semibold">
                    {androidSetupStatus.needsRuntimePrompt ? 'Needs Permission' : 'Ready'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="opacity-70">Export Folder</span>
                  <span className="font-mono font-semibold truncate max-w-[170px]">
                    {androidSetupStatus.folderName || 'Not selected yet'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {androidSetupStatus.needsRuntimePrompt && (
                  <button
                    type="button"
                    onClick={async () => {
                      await requestAndroidStoragePermission();
                      const snap = await getAndroidPermissionSnapshot();
                      setAndroidSetupStatus({
                        needsRuntimePrompt: snap.needsRuntimePrompt,
                        folderName: snap.exportFolder?.name || null,
                        sdkInt: snap.sdkInt,
                      });
                    }}
                    className="w-full min-h-[40px] px-3 rounded-xl text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                  >
                    <Shield size={14} />
                    <span>Allow Storage Permission</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    const folder = await pickAndroidExportFolder();
                    if (folder) {
                      try { localStorage.setItem('urdu_localizer_android_setup_done', '1'); } catch {}
                      addNotification(`Export folder set to "${folder.name}"`, 'success');
                      setIsAndroidSetupModalOpen(false);
                    }
                  }}
                  className="w-full min-h-[40px] px-3 rounded-xl text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                >
                  <FolderPlus size={14} />
                  <span>Select Export Folder (e.g. Downloads)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('urdu_localizer_android_setup_done', '1'); } catch {}
                    setIsAndroidSetupModalOpen(false);
                  }}
                  className="w-full min-h-[36px] px-3 rounded-xl border text-[11px] font-semibold cursor-pointer opacity-80 hover:opacity-100"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Yes / No Confirmation Dialog for Critical Workspace Actions */}
      <ConfirmDialogModal
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title || 'Confirm Action'}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Yes'}
        cancelLabel={confirmDialog?.cancelLabel || 'No'}
        danger={confirmDialog?.danger}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Chrome-Android On-Screen UI Zoom & Container Spacing Sliders Bar */}
      <OnScreenSlidersBar
        isOpen={isOnScreenSlidersOpen}
        onClose={() => setIsOnScreenSlidersOpen(false)}
        uiZoom={preferences.uiZoom}
        containerPaddingPx={preferences.containerPaddingPx}
        onChangeZoom={(zoom) => updatePreferences((prev) => ({ ...prev, uiZoom: zoom }))}
        onChangeContainerPadding={(px) =>
          updatePreferences((prev) => ({
            ...prev,
            containerPaddingPx: px,
            containerSize: paddingToContainerSize(px),
          }))
        }
      />

      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme === 'classic' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme === 'classic' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}; }
      `}} />
    </div>
  );
}
