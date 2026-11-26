import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Download,
  FileText,
  Sparkles,
  Film,
  FileCode,
  Youtube,
  Music,
  Smartphone,
  Share2,
  RotateCcw,
  FolderOpen,
  Folder,
  ChevronDown,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Globe,
  Languages,
  Search,
  Tag,
  Layers,
} from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import { dbService } from '../services/db';
import {
  AndroidExportFolder,
  AndroidSaveMode,
  clearAndroidExportFolder,
  getSelectedAndroidExportFolder,
  isNativeAndroid,
  pickAndroidExportFolder,
} from '../services/androidNative';
import { registerBackHandler } from '../utils/backNavigation';
import {
  TranslationSettings,
  TARGET_LANGUAGES,
  SCRIPT_MODES,
  DEFAULT_TRANSLATION_SETTINGS,
} from '../services/translationSettings';
import {
  resolveExportCategory,
  cleanHeuristicShortTitle,
  buildTaggedExportFileName,
} from '../utils/exportCategorizer';
import { InfoPopover } from './InfoPopover';
import { cn } from '../utils/cn';

export type DownloadFormat =
  | 'srt-formatted'
  | 'ass'
  | 'ssa'
  | 'vtt'
  | 'srt-clean'
  | 'sbv'
  | 'lrc'
  | 'txt'
  | 'json'
  | 'copy';

export interface ExportFolderTarget {
  directoryHandle?: any;
  dirName?: string;
  customBaseName?: string;
  subFolder?: string;
  tagSlug?: string;
  includeTag?: boolean;
}

export interface LastExportNotice {
  fileName: string;
  locationLabel: string;
  shared?: boolean;
  onShareAgain?: () => void;
}

interface DownloadTabViewProps {
  subtitles: SubtitleItem[];
  fileName: string;
  syncedBaseTitle?: string;
  onChangeSyncedBaseTitle?: (title: string) => void;
  onGoTranslate?: () => void;
  detectedFormat: string;
  context?: string;
  translationSettings?: TranslationSettings;
  isTranslating?: boolean;
  isGoogleTranslatingAll?: boolean;
  androidSaveMode?: AndroidSaveMode;
  onChangeAndroidSaveMode?: (mode: AndroidSaveMode) => void;
  autoCategorizeFolders?: boolean;
  onToggleAutoCategorizeFolders?: (enabled: boolean) => void;
  autoTagFileNames?: boolean;
  onToggleAutoTagFileNames?: (enabled: boolean) => void;
  onSuggestShortFileName?: (rawName: string) => Promise<{
    primary: string;
    alternatives: string[];
    usedSearch: boolean;
  }>;
  lastExportNotice?: LastExportNotice | null;
  onDismissLastExportNotice?: () => void;
  onDownloadFormatted: (
    format: DownloadFormat,
    type: 'ai' | 'google' | 'original',
    folderTarget?: ExportFolderTarget
  ) => void | Promise<void>;
  onRefreshDownloadSession: () => void;
}

const EXPORT_DIR_KEY = 'export_subtitles_dir';

const DOWNLOAD_OPTIONS: {
  format: DownloadFormat;
  name: string;
  ext: string;
  description: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
}[] = [
  { format: 'srt-formatted', name: 'Styled SRT', ext: '.srt', description: 'Gradient & font tags for VLC / MX Player', icon: Download },
  { format: 'ass', name: 'Advanced SubStation', ext: '.ass', description: 'Full cinema styling, outlines & positioning', icon: Sparkles },
  { format: 'ssa', name: 'SubStation Alpha', ext: '.ssa', description: 'Classic v4 SubStation format', icon: Film },
  { format: 'vtt', name: 'WebVTT', ext: '.vtt', description: 'HTML5 web & mobile video players', icon: FileCode },
  { format: 'srt-clean', name: 'Clean Plain SRT', ext: '.srt', description: 'Universal plain text without styling tags', icon: FileText },
  { format: 'sbv', name: 'YouTube Captions', ext: '.sbv', description: 'YouTube Studio caption upload format', icon: Youtube },
  { format: 'lrc', name: 'Synced Lyrics', ext: '.lrc', description: 'Timestamped lyric/dialogue lines', icon: Music },
  { format: 'txt', name: 'Clean Transcript', ext: '.txt', description: 'Readable dialogue text file', icon: Smartphone },
  { format: 'json', name: 'JSON Timed', ext: '.json', description: 'Structured JSON with start/end timestamps', icon: FileCode },
  { format: 'copy', name: 'Copy Dialogue', ext: 'CLIP', description: 'Copy subtitle lines directly to clipboard', icon: Share2 },
];

export const DownloadTabView: React.FC<DownloadTabViewProps> = ({
  subtitles,
  fileName,
  syncedBaseTitle,
  onChangeSyncedBaseTitle,
  onGoTranslate,
  detectedFormat,
  context = '',
  translationSettings = DEFAULT_TRANSLATION_SETTINGS,
  isTranslating = false,
  isGoogleTranslatingAll = false,
  androidSaveMode = 'documents',
  onChangeAndroidSaveMode,
  autoCategorizeFolders = true,
  onToggleAutoCategorizeFolders,
  autoTagFileNames = true,
  onToggleAutoTagFileNames,
  onSuggestShortFileName,
  lastExportNotice = null,
  onDismissLastExportNotice,
  onDownloadFormatted,
  onRefreshDownloadSession,
}) => {
  const [selectedStream, setSelectedStream] = useState<'ai' | 'google' | 'original'>('ai');
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>('srt-formatted');
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const [selectedDirHandle, setSelectedDirHandle] = useState<any | null>(null);
  const [selectedDirName, setSelectedDirName] = useState<string>('');
  const [androidExportFolder, setAndroidExportFolder] = useState<AndroidExportFolder | null>(() =>
    getSelectedAndroidExportFolder()
  );
  const [isPickingAndroidFolder, setIsPickingAndroidFolder] = useState(false);
  const [folderStatusNote, setFolderStatusNote] = useState<string | null>(null);
  const [isExportOverlayOpen, setIsExportOverlayOpen] = useState(false);
  const [isBatchIncompleteConfirmOpen, setIsBatchIncompleteConfirmOpen] = useState(false);

  const [customBaseName, setCustomBaseName] = useState<string>(() =>
    syncedBaseTitle?.trim() || cleanHeuristicShortTitle(fileName, context)
  );
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const hasManualNameEditRef = useRef(false);
  const lastRawFileRef = useRef(fileName);
  const lastSyncedTitleRef = useRef(syncedBaseTitle || '');

  const nativeAndroid = isNativeAndroid();
  const supportsDirectoryPicker =
    typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

  // Sync filename bidirectionally with Home tab & new file loads
  useEffect(() => {
    if (lastRawFileRef.current !== fileName) {
      lastRawFileRef.current = fileName;
      hasManualNameEditRef.current = false;
      setAiSuggestions([]);
      setSuggestNote(null);
      const next = syncedBaseTitle?.trim() || cleanHeuristicShortTitle(fileName, context);
      lastSyncedTitleRef.current = next;
      setCustomBaseName(next);
      return;
    }
    if (syncedBaseTitle !== undefined && syncedBaseTitle.trim() !== lastSyncedTitleRef.current.trim()) {
      const next = syncedBaseTitle.trim() || cleanHeuristicShortTitle(fileName, context);
      lastSyncedTitleRef.current = next;
      setCustomBaseName(next);
      return;
    }
    if (!hasManualNameEditRef.current) {
      const next = syncedBaseTitle?.trim() || cleanHeuristicShortTitle(fileName, context);
      setCustomBaseName(next);
    }
  }, [fileName, context, syncedBaseTitle]);

  useEffect(() => {
    if (!nativeAndroid) return;
    const syncFolder = () => setAndroidExportFolder(getSelectedAndroidExportFolder());
    syncFolder();
    window.addEventListener('urduLocalizerFolderPicked', syncFolder);
    return () => window.removeEventListener('urduLocalizerFolderPicked', syncFolder);
  }, [nativeAndroid]);

  useEffect(() => {
    let active = true;
    dbService
      .loadDirectoryHandle(EXPORT_DIR_KEY)
      .then((handle) => {
        if (active && handle) {
          setSelectedDirHandle(handle);
          setSelectedDirName(handle.name || 'Selected Folder');
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isExportOverlayOpen && !isBatchIncompleteConfirmOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportOverlayOpen(false);
        setIsBatchIncompleteConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExportOverlayOpen, isBatchIncompleteConfirmOpen]);

  useEffect(() => {
    return registerBackHandler(() => {
      if (isBatchIncompleteConfirmOpen) {
        setIsBatchIncompleteConfirmOpen(false);
        return true;
      }
      if (isExportOverlayOpen) {
        setIsExportOverlayOpen(false);
        return true;
      }
      if (isFormatMenuOpen) {
        setIsFormatMenuOpen(false);
        return true;
      }
      return false;
    });
  }, [isBatchIncompleteConfirmOpen, isExportOverlayOpen, isFormatMenuOpen]);

  const handleSelectExportFolder = async () => {
    setFolderStatusNote(null);
    if (nativeAndroid) {
      setIsPickingAndroidFolder(true);
      try {
        const picked = await pickAndroidExportFolder();
        if (picked) {
          setAndroidExportFolder(picked);
          setFolderStatusNote(`Export folder set to "${picked.name}". Subfolders are created automatically inside.`);
        } else {
          setFolderStatusNote('No folder selected. Using current Android destination.');
        }
      } finally {
        setIsPickingAndroidFolder(false);
      }
      return;
    }
    if (!supportsDirectoryPicker) {
      setFolderStatusNote('Folder picker is not supported in this browser; Export uses Device Downloads / Share.');
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      if (!handle) return;
      setSelectedDirHandle(handle);
      setSelectedDirName(handle.name || 'Selected Folder');
      await dbService.saveDirectoryHandle(EXPORT_DIR_KEY, handle).catch(() => {});
      setFolderStatusNote(`Target folder set to "${handle.name}"`);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setFolderStatusNote(err?.message || 'Could not access folder. Using Device Downloads.');
      }
    }
  };

  const handleClearExportFolder = async () => {
    if (nativeAndroid) {
      clearAndroidExportFolder();
      setAndroidExportFolder(null);
      setFolderStatusNote('Cleared custom folder. Default: Documents/UrduLocalizer.');
      return;
    }
    setSelectedDirHandle(null);
    setSelectedDirName('');
    setFolderStatusNote(null);
    await dbService.saveDirectoryHandle(EXPORT_DIR_KEY, null).catch(() => {});
  };

  const handleAiSuggestShortName = async () => {
    if (isSuggestingName) return;
    setIsSuggestingName(true);
    setSuggestNote(null);
    try {
      if (onSuggestShortFileName) {
        const result = await onSuggestShortFileName(fileName);
        const cleanedPrimary = result.primary?.trim() || cleanHeuristicShortTitle(fileName, context);
        const candidates = Array.from(
          new Set([cleanedPrimary, ...(result.alternatives || [])].filter(Boolean))
        ).slice(0, 4);
        hasManualNameEditRef.current = true;
        lastSyncedTitleRef.current = cleanedPrimary;
        setCustomBaseName(cleanedPrimary);
        onChangeSyncedBaseTitle?.(cleanedPrimary);
        setAiSuggestions(candidates);
        setSuggestNote(
          result.usedSearch
            ? 'Short title verified via Gemini + Google Search'
            : 'Short title suggested via Gemini'
        );
      } else {
        const offlineTitle = cleanHeuristicShortTitle(fileName, context);
        hasManualNameEditRef.current = true;
        lastSyncedTitleRef.current = offlineTitle;
        setCustomBaseName(offlineTitle);
        onChangeSyncedBaseTitle?.(offlineTitle);
        setAiSuggestions([offlineTitle]);
        setSuggestNote('Cleaned locally offline');
      }
    } catch {
      const offlineTitle = cleanHeuristicShortTitle(fileName, context);
      hasManualNameEditRef.current = true;
      lastSyncedTitleRef.current = offlineTitle;
      setCustomBaseName(offlineTitle);
      onChangeSyncedBaseTitle?.(offlineTitle);
      setAiSuggestions([offlineTitle]);
      setSuggestNote('Network/Gemini unavailable — cleaned locally offline');
    } finally {
      setIsSuggestingName(false);
    }
  };

  const handleResetShortName = () => {
    hasManualNameEditRef.current = false;
    const clean = cleanHeuristicShortTitle(fileName, context);
    lastSyncedTitleRef.current = clean;
    setCustomBaseName(clean);
    onChangeSyncedBaseTitle?.(clean);
    setSuggestNote('Reset to clean refined title');
  };

  const totalCount = subtitles.length;
  const aiErrorCount = subtitles.filter(
    (s) => s.translatedText?.trim() === 'Translation Error'
  ).length;
  const gErrorCount = subtitles.filter(
    (s) => s.googleTranslateText?.trim() === 'Translation Error'
  ).length;
  const translatedCount = subtitles.filter(
    (s) => Boolean(s.translatedText?.trim()) && s.translatedText?.trim() !== 'Translation Error'
  ).length;
  const googleCount = subtitles.filter(
    (s) => Boolean(s.googleTranslateText?.trim()) && s.googleTranslateText?.trim() !== 'Translation Error'
  ).length;
  const activeOption = DOWNLOAD_OPTIONS.find((o) => o.format === selectedFormat) || DOWNLOAD_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  const categoryInfo = useMemo(
    () =>
      resolveExportCategory({
        streamType: selectedStream,
        translationSettings,
        subtitles,
      }),
    [selectedStream, translationSettings, subtitles]
  );

  const resolvedSubFolder = autoCategorizeFolders ? categoryInfo.subFolder : '';
  const effectiveTagSlug =
    selectedFormat === 'srt-clean'
      ? categoryInfo.tagSlug.replace(/\]$/, '-Clean]')
      : categoryInfo.tagSlug;

  const effectiveBaseTitle =
    customBaseName.trim() || cleanHeuristicShortTitle(fileName, context);

  const previewFileName =
    selectedFormat === 'copy'
      ? 'Clipboard Transcript'
      : buildTaggedExportFileName({
          baseTitle: effectiveBaseTitle,
          tagSlug: effectiveTagSlug,
          extension: activeOption.ext,
          includeTag: autoTagFileNames,
        });

  const targetLangOption = TARGET_LANGUAGES.find((l) => l.code === translationSettings.targetLanguage);
  const scriptOption = SCRIPT_MODES.find((s) => s.id === translationSettings.scriptMode);

  const streamLabel =
    selectedStream === 'ai'
      ? 'AI Translation'
      : selectedStream === 'google'
      ? 'Neutral / Google Translate'
      : 'Original Source';

  const languageLabel =
    selectedStream === 'original'
      ? translationSettings.sourceLanguage && translationSettings.sourceLanguage !== 'auto'
        ? `Source (${translationSettings.sourceLanguage.toUpperCase()})`
        : 'Original Source Language'
      : selectedStream === 'ai'
      ? `${targetLangOption ? `${targetLangOption.name} (${targetLangOption.nativeName})` : 'Urdu (اردو)'}${
          scriptOption ? ` · ${scriptOption.badge}` : ''
        }`
      : targetLangOption
      ? `${targetLangOption.name} (${targetLangOption.nativeName})`
      : 'Urdu (اردو)';

  const activeCompletedCount =
    selectedStream === 'ai'
      ? translatedCount
      : selectedStream === 'google'
      ? googleCount
      : totalCount;

  const activeErrorCount =
    selectedStream === 'ai'
      ? aiErrorCount
      : selectedStream === 'google'
      ? gErrorCount
      : 0;

  const completionPercent = totalCount > 0 ? Math.round((activeCompletedCount / totalCount) * 100) : 0;
  const isStreamTranslating =
    (selectedStream === 'ai' && isTranslating) ||
    (selectedStream === 'google' && isGoogleTranslatingAll);

  const isActiveStreamIncomplete =
    totalCount > 0 &&
    selectedStream !== 'original' &&
    (activeCompletedCount < totalCount || activeErrorCount > 0 || isStreamTranslating);

  const translationStatus = (() => {
    if (selectedStream === 'original') {
      return {
        state: 'complete' as const,
        title: 'Original Stream Ready',
        detail: `${totalCount} of ${totalCount} source subtitle blocks ready for export.`,
      };
    }
    if (isStreamTranslating) {
      return {
        state: 'progress' as const,
        title: 'Translation In Progress',
        detail: `${activeCompletedCount} of ${totalCount} blocks translated so far (${completionPercent}%). Exporting now will produce an incomplete file.`,
      };
    }
    if (totalCount > 0 && activeCompletedCount === totalCount && activeErrorCount === 0) {
      return {
        state: 'complete' as const,
        title: 'Translation Completed',
        detail: `All ${totalCount} of ${totalCount} subtitle blocks are translated cleanly (100%).`,
      };
    }
    if (activeCompletedCount > 0 || activeErrorCount > 0) {
      const missingCount = Math.max(0, totalCount - activeCompletedCount);
      return {
        state: 'partial' as const,
        title: 'Warning: Incomplete Subtitle Stream',
        detail: `${activeCompletedCount} of ${totalCount} blocks ready (${completionPercent}%). ${missingCount} untranslated${
          activeErrorCount > 0 ? ` · ${activeErrorCount} translation error(s)` : ''
        } — missing lines will fall back or appear blank.`,
      };
    }
    return {
      state: 'empty' as const,
      title: 'Warning: Stream Not Translated Yet',
      detail: `0 of ${totalCount} blocks translated in ${streamLabel}. Exporting now will fall back to untranslated text.`,
    };
  })();

  const readyStreamsForBatch = useMemo(() => {
    const list: Array<'ai' | 'google' | 'original'> = [];
    if (translatedCount > 0) list.push('ai');
    if (googleCount > 0) list.push('google');
    if (totalCount > 0) list.push('original');
    return list;
  }, [translatedCount, googleCount, totalCount]);

  const incompleteBatchStreamNames = useMemo(() => {
    const names: string[] = [];
    if (readyStreamsForBatch.includes('ai') && (translatedCount < totalCount || aiErrorCount > 0 || isTranslating)) {
      names.push(`AI (${translatedCount}/${totalCount}${aiErrorCount > 0 ? `, ${aiErrorCount} error(s)` : ''})`);
    }
    if (readyStreamsForBatch.includes('google') && (googleCount < totalCount || gErrorCount > 0 || isGoogleTranslatingAll)) {
      names.push(`Neutral (${googleCount}/${totalCount}${gErrorCount > 0 ? `, ${gErrorCount} error(s)` : ''})`);
    }
    return names;
  }, [readyStreamsForBatch, translatedCount, googleCount, totalCount, aiErrorCount, gErrorCount, isTranslating, isGoogleTranslatingAll]);

  const canSaveAllBatch =
    selectedFormat !== 'copy' &&
    readyStreamsForBatch.length > 1 &&
    (!nativeAndroid || androidSaveMode !== 'share');

  const handleConfirmExport = () => {
    setIsExportOverlayOpen(false);
    void onDownloadFormatted(selectedFormat, selectedStream, {
      ...(selectedDirHandle ? { directoryHandle: selectedDirHandle, dirName: selectedDirName } : {}),
      customBaseName: effectiveBaseTitle,
      subFolder: resolvedSubFolder,
      tagSlug: categoryInfo.tagSlug,
      includeTag: autoTagFileNames,
    });
  };

  const executeBatchSaveAll = async () => {
    if (!canSaveAllBatch || isSavingAll) return;
    setIsBatchIncompleteConfirmOpen(false);
    setIsSavingAll(true);
    try {
      for (const stream of readyStreamsForBatch) {
        const cat = resolveExportCategory({
          streamType: stream,
          translationSettings,
          subtitles,
        });
        await onDownloadFormatted(selectedFormat, stream, {
          ...(selectedDirHandle ? { directoryHandle: selectedDirHandle, dirName: selectedDirName } : {}),
          customBaseName: effectiveBaseTitle,
          subFolder: autoCategorizeFolders ? cat.subFolder : '',
          tagSlug: cat.tagSlug,
          includeTag: autoTagFileNames,
        });
      }
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleSaveAllReadyStreams = async () => {
    if (!canSaveAllBatch || isSavingAll) return;
    if (incompleteBatchStreamNames.length > 0) {
      setIsBatchIncompleteConfirmOpen(true);
      return;
    }
    await executeBatchSaveAll();
  };

  const destinationSummary = nativeAndroid
    ? androidSaveMode === 'share'
      ? 'Android Share Sheet'
      : androidExportFolder
      ? resolvedSubFolder
        ? `${androidExportFolder.name}/${resolvedSubFolder}`
        : androidExportFolder.name
      : resolvedSubFolder
      ? `Documents/UrduLocalizer/${resolvedSubFolder}`
      : 'Documents/UrduLocalizer'
    : selectedDirName
    ? resolvedSubFolder
      ? `${selectedDirName}/${resolvedSubFolder}`
      : selectedDirName
    : 'Device Downloads / Share';

  return (
    <div className="space-y-3 max-w-5xl mx-auto w-full pb-16">
      {/* Stream Selector */}
      <div
        className="rounded-xl border space-y-2.5 theme-card mc-card-1"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Download size={15} style={{ color: 'var(--theme-accent)' }} className="mc-card-icon" />
              <h2 className="text-xs sm:text-sm font-semibold truncate mc-card-title">Export Subtitles</h2>
              <InfoPopover
                title="Auto-Categorized Folders & Tags"
                description="Exports automatically organize into Urdu (AI), Urdu (Neutral), Bilingual, or English subfolders with matching filename tags and UTF-8 BOM."
                align="left"
              />
            </div>
            <p className="text-[11px] opacity-60 font-mono tabular-nums truncate mt-0.5">
              {fileName || 'No file'} · {subtitles.length} lines
              {detectedFormat ? ` · ${detectedFormat}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefreshDownloadSession}
            className="min-h-[34px] px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 touch-tactile btn-inch-cap"
            style={{
              backgroundColor: 'var(--theme-elevated)',
              borderColor: 'var(--theme-border)',
            }}
            title="Refresh export session"
          >
            <RotateCcw size={12} className="shrink-0" />
            <span className="truncate">Sync</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'ai', label: 'AI Urdu', count: translatedCount },
              { id: 'google', label: 'Neutral / Google', count: googleCount },
              { id: 'original', label: 'Original', count: subtitles.length },
            ] as const
          ).map((st) => {
            const active = selectedStream === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStream(st.id)}
                className={cn(
                  'min-h-[36px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer touch-tactile btn-inch-cap',
                  active ? 'text-white' : 'opacity-80'
                )}
                style={
                  active
                    ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                    : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                }
              >
                <span className="truncate">{st.label}</span>
                <span className="text-[10px] font-mono opacity-80 tabular-nums shrink-0">{st.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Incomplete Subtitle Stream Warning */}
      {subtitles.length > 0 && isActiveStreamIncomplete && (
        <div
          role="alert"
          className="rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderColor: 'rgba(245, 158, 11, 0.45)',
          }}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-500">{translationStatus.title}</p>
              <p className="text-[11px] opacity-85 leading-snug">{translationStatus.detail}</p>
            </div>
          </div>
          {onGoTranslate && !isStreamTranslating && (
            <button
              type="button"
              onClick={onGoTranslate}
              className="min-h-[34px] px-3 rounded-lg border text-[11px] font-semibold shrink-0 cursor-pointer touch-tactile"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'rgba(245, 158, 11, 0.45)',
              }}
            >
              Finish Translating
            </button>
          )}
        </div>
      )}

      {/* Format, Smart Short Filename & Destination */}
      {subtitles.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-6 text-center text-xs opacity-65"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
          }}
        >
          Load subtitles on Home to export.
        </div>
      ) : (
        <>
          <div
            className="rounded-xl border space-y-3.5 theme-card mc-card-2"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              padding: 'var(--card-pad)',
            }}
          >
            {/* Export Format Drop-Down Menu */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold opacity-90 block mc-dropdown-alt-title">Export Format</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFormatMenuOpen((prev) => !prev)}
                  aria-expanded={isFormatMenuOpen}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-left cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: isFormatMenuOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ActiveIcon size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span>{activeOption.name}</span>
                        <span className="text-[10px] font-mono opacity-60">{activeOption.ext}</span>
                      </div>
                      <p className="text-[10px] opacity-60 truncate">{activeOption.description}</p>
                    </div>
                  </div>
                  <ChevronDown
                    size={15}
                    className={cn('shrink-0 opacity-70 transition-transform', isFormatMenuOpen && 'rotate-180')}
                  />
                </button>

                {isFormatMenuOpen && (
                  <div
                    className="mt-1.5 rounded-xl border overflow-hidden divide-y max-h-72 overflow-y-auto shadow-lg mc-dropdown-alt"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      borderColor: 'var(--theme-border)',
                    }}
                  >
                    {DOWNLOAD_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = opt.format === selectedFormat;
                      return (
                        <button
                          key={opt.format}
                          type="button"
                          onClick={() => {
                            setSelectedFormat(opt.format);
                            setIsFormatMenuOpen(false);
                          }}
                          className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer hover:opacity-95 transition-colors"
                          style={{
                            backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'transparent',
                            borderColor: 'var(--theme-border)',
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                                <span>{opt.name}</span>
                                <span className="text-[10px] font-mono opacity-60">{opt.ext}</span>
                              </div>
                              <p className="text-[10px] opacity-60 truncate">{opt.description}</p>
                            </div>
                          </div>
                          {isSelected && <Check size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Smart Short Filename, Auto-Tags & Categorized Subfolders */}
            {selectedFormat !== 'copy' && (
              <div
                className="p-3 rounded-xl border space-y-2.5 mc-card-3"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label htmlFor="export-short-name" className="text-[11px] font-semibold opacity-95 flex items-center gap-1.5 mc-card-title">
                    <Tag size={13} style={{ color: 'var(--theme-accent)' }} className="mc-card-icon" />
                    <span>Short Filename &amp; Auto-Tag</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleResetShortName}
                      className="min-h-[30px] px-2 rounded-lg border text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer opacity-80 hover:opacity-100"
                      style={{
                        backgroundColor: 'var(--theme-surface)',
                        borderColor: 'var(--theme-border)',
                      }}
                      title="Reset to clean heuristic title"
                    >
                      <RotateCcw size={11} />
                      <span>Clean</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { void handleAiSuggestShortName(); }}
                      disabled={isSuggestingName}
                      className="min-h-[30px] px-2.5 rounded-lg text-white text-[10.5px] font-semibold flex items-center gap-1.5 cursor-pointer touch-tactile disabled:opacity-60"
                      style={{ backgroundColor: 'var(--theme-accent)' }}
                      title="Suggest concise official title using Gemini & Google Search"
                    >
                      {isSuggestingName ? (
                        <Loader2 size={11} className="animate-spin shrink-0" />
                      ) : (
                        <>
                          <Sparkles size={11} className="shrink-0" />
                          <Search size={10} className="shrink-0" />
                        </>
                      )}
                      <span>{isSuggestingName ? 'Searching...' : 'AI Suggest'}</span>
                    </button>
                  </div>
                </div>

                <input
                  id="export-short-name"
                  type="text"
                  value={customBaseName}
                  onChange={(e) => {
                    hasManualNameEditRef.current = true;
                    const val = e.target.value;
                    lastSyncedTitleRef.current = val;
                    setCustomBaseName(val);
                    onChangeSyncedBaseTitle?.(val);
                  }}
                  placeholder="Refined title synced with Home (e.g. Dune (2021) Part 1)"
                  className="w-full min-h-[38px] px-3 rounded-lg border text-xs font-medium focus:outline-none"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                />

                {aiSuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {aiSuggestions.map((candidate) => {
                      const active = customBaseName.trim().toLowerCase() === candidate.toLowerCase();
                      return (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => {
                            hasManualNameEditRef.current = true;
                            lastSyncedTitleRef.current = candidate;
                            setCustomBaseName(candidate);
                            onChangeSyncedBaseTitle?.(candidate);
                          }}
                          className={cn(
                            'min-h-[28px] px-2.5 rounded-lg border text-[10.5px] font-medium cursor-pointer transition-colors',
                            active ? 'text-white' : 'opacity-85 hover:opacity-100'
                          )}
                          style={
                            active
                              ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                              : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                          }
                        >
                          {candidate}
                        </button>
                      );
                    })}
                  </div>
                )}

                {suggestNote && (
                  <p className="text-[10px] opacity-70">{suggestNote}</p>
                )}

                {/* Auto Folder & Auto Tag Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onToggleAutoCategorizeFolders?.(!autoCategorizeFolders)}
                    className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 text-left cursor-pointer"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      borderColor: autoCategorizeFolders ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold truncate">Auto Category Folders</p>
                        <p className="text-[9.5px] opacity-60 truncate">
                          Urdu (AI), Urdu (Neutral), English...
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: autoCategorizeFolders ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                        color: autoCategorizeFolders ? 'var(--theme-accent-text)' : 'inherit',
                      }}
                    >
                      {autoCategorizeFolders ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleAutoTagFileNames?.(!autoTagFileNames)}
                    className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 text-left cursor-pointer"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      borderColor: autoTagFileNames ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold truncate">Auto Stream Tag</p>
                        <p className="text-[9.5px] opacity-60 truncate font-mono">
                          {effectiveTagSlug}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: autoTagFileNames ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                        color: autoTagFileNames ? 'var(--theme-accent-text)' : 'inherit',
                      }}
                    >
                      {autoTagFileNames ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>

                {/* Live Subfolder & Final File Preview */}
                <div
                  className="px-2.5 py-2 rounded-lg border space-y-1 text-[10.5px]"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: 'var(--theme-border)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="opacity-65 shrink-0">Folder</span>
                    <span className="font-mono font-semibold truncate text-right" style={{ color: 'var(--theme-accent-text)' }}>
                      {resolvedSubFolder || 'Root Folder (Flat)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="opacity-65 shrink-0">Filename</span>
                    <span className="font-mono font-semibold truncate text-right selectable-text">
                      {previewFileName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Destination Folder / Android Native Target */}
            {selectedFormat !== 'copy' && (
              <div className="space-y-1.5 mc-card-4 rounded-xl border p-3">
                <label className="text-[11px] font-semibold opacity-95 block mc-card-title">Destination Folder</label>
                {nativeAndroid ? (
                  <div
                    className="px-3 py-2.5 rounded-xl border space-y-2.5"
                    style={{
                      backgroundColor: 'var(--theme-elevated)',
                      borderColor: 'var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FolderOpen size={15} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {androidSaveMode === 'share'
                              ? 'Android Share / Save-As Sheet'
                              : androidExportFolder
                              ? androidExportFolder.name
                              : 'Documents/UrduLocalizer (Default)'}
                          </p>
                          <p className="text-[10px] opacity-60 truncate">
                            {androidSaveMode === 'share'
                              ? 'Opens system Share / Save-As picker on export'
                              : androidExportFolder
                              ? autoCategorizeFolders
                                ? `Auto-creates "${categoryInfo.subFolder}" subfolder inside`
                                : 'Saving directly inside your selected Android folder'
                              : autoCategorizeFolders
                              ? `Auto-creates "${categoryInfo.subFolder}" inside Documents/UrduLocalizer`
                              : 'Tap Select Folder to choose Downloads or any custom folder'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {androidExportFolder && androidSaveMode !== 'share' && (
                          <button
                            type="button"
                            onClick={handleClearExportFolder}
                            className="min-h-[34px] w-8 rounded-lg border flex items-center justify-center cursor-pointer opacity-75 hover:opacity-100"
                            style={{
                              backgroundColor: 'var(--theme-surface)',
                              borderColor: 'var(--theme-border)',
                            }}
                            title="Clear custom export folder"
                            aria-label="Clear custom export folder"
                          >
                            <X size={13} />
                          </button>
                        )}
                        {androidSaveMode !== 'share' && (
                          <button
                            type="button"
                            onClick={handleSelectExportFolder}
                            disabled={isPickingAndroidFolder}
                            className="min-h-[34px] px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap disabled:opacity-60"
                            style={{ backgroundColor: 'var(--theme-accent)' }}
                          >
                            {isPickingAndroidFolder ? (
                              <Loader2 size={12} className="animate-spin shrink-0" />
                            ) : (
                              <FolderOpen size={12} className="shrink-0" />
                            )}
                            <span className="truncate">{androidExportFolder ? 'Change' : 'Select Folder'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {onChangeAndroidSaveMode && (
                      <div
                        className="pt-2 border-t flex items-center justify-between gap-2 flex-wrap"
                        style={{ borderColor: 'var(--theme-border)' }}
                      >
                        <span className="text-[10.5px] opacity-70 font-medium">Export Behavior</span>
                        <select
                          aria-label="Android Export Mode"
                          value={androidSaveMode}
                          onChange={(e) => onChangeAndroidSaveMode(e.target.value as AndroidSaveMode)}
                          className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer"
                          style={{
                            backgroundColor: 'var(--theme-surface)',
                            borderColor: 'var(--theme-border)',
                          }}
                        >
                          <option value="documents">Save to Folder</option>
                          <option value="documents-and-share">Save to Folder + Share</option>
                          <option value="share">Share / Save-As Only</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="px-3 py-2 rounded-xl border flex items-center justify-between gap-2 flex-wrap"
                    style={{
                      backgroundColor: 'var(--theme-elevated)',
                      borderColor: 'var(--theme-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FolderOpen size={15} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {selectedDirName ? selectedDirName : 'Device Downloads / Share'}
                        </p>
                        <p className="text-[10px] opacity-55 truncate">
                          {selectedDirName
                            ? autoCategorizeFolders
                              ? `Auto-creates "${categoryInfo.subFolder}" inside ${selectedDirName}`
                              : 'Exports write directly into this selected folder'
                            : supportsDirectoryPicker
                            ? 'Tap Folder to save into auto-categorized local folders'
                            : 'Saves via system Share sheet or Downloads'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedDirHandle && (
                        <button
                          type="button"
                          onClick={handleClearExportFolder}
                          className="min-h-[34px] w-8 rounded-lg border flex items-center justify-center cursor-pointer opacity-75 hover:opacity-100"
                          style={{
                            backgroundColor: 'var(--theme-surface)',
                            borderColor: 'var(--theme-border)',
                          }}
                          title="Clear selected folder"
                          aria-label="Clear selected folder"
                        >
                          <X size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSelectExportFolder}
                        className="min-h-[34px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap"
                        style={{
                          backgroundColor: 'var(--theme-surface)',
                          borderColor: 'var(--theme-border)',
                        }}
                      >
                        <FolderOpen size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                        <span className="truncate">{selectedDirName ? 'Change' : 'Folder'}</span>
                      </button>
                    </div>
                  </div>
                )}
                {folderStatusNote && <p className="text-[10px] opacity-75 px-1">{folderStatusNote}</p>}
              </div>
            )}

            {lastExportNotice && (
              <div
                className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.10)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                }}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">Saved: {lastExportNotice.fileName}</p>
                    <p className="text-[10.5px] opacity-80 truncate">
                      Location: {lastExportNotice.locationLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {lastExportNotice.onShareAgain && (
                    <button
                      type="button"
                      onClick={lastExportNotice.onShareAgain}
                      className="min-h-[32px] px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile"
                      style={{ backgroundColor: 'var(--theme-accent)' }}
                    >
                      <Share2 size={12} />
                      <span>Share / Open</span>
                    </button>
                  )}
                  {onDismissLastExportNotice && (
                    <button
                      type="button"
                      onClick={onDismissLastExportNotice}
                      className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                      aria-label="Dismiss saved notice"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Docked Export Action Bar */}
          <div
            className="sticky bottom-[60px] lg:bottom-3 z-20 rounded-xl border px-3 py-2.5 shadow-lg flex items-center justify-between gap-2 mc-footer"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate flex items-center gap-1.5 mc-footer-title">
                <span className="truncate">{previewFileName}</span>
              </div>
              <p className="text-[10px] font-mono opacity-65 truncate tabular-nums">
                {resolvedSubFolder || streamLabel} · {activeCompletedCount}/{totalCount} ({completionPercent}%)
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {canSaveAllBatch && (
                <button
                  type="button"
                  onClick={() => { void handleSaveAllReadyStreams(); }}
                  disabled={isSavingAll}
                  className="min-h-[40px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                  }}
                  title="Download all ready streams into their respective subfolders"
                >
                  {isSavingAll ? (
                    <Loader2 size={13} className="animate-spin shrink-0" />
                  ) : (
                    <Layers size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                  )}
                  <span className="truncate">All ({readyStreamsForBatch.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExportOverlayOpen(true)}
                className="min-h-[40px] px-4 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm touch-tactile btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                {selectedFormat === 'copy' ? (
                  <Share2 size={14} className="shrink-0" />
                ) : (
                  <Download size={14} className="shrink-0" />
                )}
                <span className="truncate">{selectedFormat === 'copy' ? 'Copy' : 'Export'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Pre-Export Pop-Up Overlay */}
      {isExportOverlayOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/52 backdrop-touch-lock flex items-center justify-center p-4"
          onClick={() => setIsExportOverlayOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-overlay-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden anim-pop-in mc-popup mc-role-export"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b flex items-center justify-between gap-2 mc-popup-header"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Download size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mc-popup-title" />
                <h3 id="export-overlay-title" className="text-sm font-semibold truncate mc-popup-title">
                  Confirm Subtitle Export
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportOverlayOpen(false)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer opacity-75 hover:opacity-100"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }}
                aria-label="Close export confirmation"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Translation State Banner */}
              <div
                className="p-3 rounded-xl border flex items-start gap-2.5"
                style={{
                  backgroundColor:
                    translationStatus.state === 'complete'
                      ? 'rgba(16, 185, 129, 0.10)'
                      : translationStatus.state === 'progress'
                      ? 'var(--theme-accent-soft)'
                      : 'rgba(245, 158, 11, 0.12)',
                  borderColor:
                    translationStatus.state === 'complete'
                      ? 'rgba(16, 185, 129, 0.35)'
                      : translationStatus.state === 'progress'
                      ? 'var(--theme-accent)'
                      : 'rgba(245, 158, 11, 0.40)',
                }}
              >
                {translationStatus.state === 'complete' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : translationStatus.state === 'progress' ? (
                  <Loader2 size={18} className="animate-spin shrink-0 mt-0.5" style={{ color: 'var(--theme-accent)' }} />
                ) : (
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{translationStatus.title}</p>
                  <p className="text-[11px] opacity-80 leading-snug mt-0.5">{translationStatus.detail}</p>
                </div>
              </div>

              {/* Stream, Language & Target Summary */}
              <div
                className="rounded-xl border divide-y text-xs"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="opacity-65 flex items-center gap-1.5">
                    <Languages size={13} style={{ color: 'var(--theme-accent)' }} />
                    <span>Subtitle Stream</span>
                  </span>
                  <span className="font-semibold text-right">{streamLabel}</span>
                </div>
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="opacity-65 flex items-center gap-1.5">
                    <Globe size={13} style={{ color: 'var(--theme-accent)' }} />
                    <span>Language</span>
                  </span>
                  <span className="font-semibold text-right">{languageLabel}</span>
                </div>
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="opacity-65 flex items-center gap-1.5 shrink-0">
                    <FileText size={13} style={{ color: 'var(--theme-accent)' }} />
                    <span>Output File</span>
                  </span>
                  <span className="font-semibold font-mono text-right truncate max-w-[200px]">
                    {previewFileName}
                  </span>
                </div>
                {selectedFormat !== 'copy' && (
                  <div className="px-3 py-2 flex items-center justify-between gap-2">
                    <span className="opacity-65 flex items-center gap-1.5 shrink-0">
                      <FolderOpen size={13} style={{ color: 'var(--theme-accent)' }} />
                      <span>Destination</span>
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-right truncate max-w-[185px]">
                        {destinationSummary}
                      </span>
                      {nativeAndroid && androidSaveMode !== 'share' && (
                        <button
                          type="button"
                          onClick={handleSelectExportFolder}
                          className="text-[10.5px] font-semibold underline cursor-pointer shrink-0"
                          style={{ color: 'var(--theme-accent-text)' }}
                        >
                          {androidExportFolder ? 'Change' : 'Choose'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 border-t flex items-center justify-end gap-2 flex-wrap mc-popup-footer"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              {isActiveStreamIncomplete && onGoTranslate && (
                <button
                  type="button"
                  onClick={() => {
                    setIsExportOverlayOpen(false);
                    onGoTranslate();
                  }}
                  className="min-h-[38px] px-3 rounded-xl border text-xs font-semibold cursor-pointer touch-tactile mr-auto"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                  }}
                >
                  Translate Remaining
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExportOverlayOpen(false)}
                className="min-h-[38px] px-3.5 rounded-xl border text-xs font-semibold cursor-pointer touch-tactile"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                className={cn(
                  'min-h-[38px] px-4 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile',
                  isActiveStreamIncomplete && 'bg-amber-600 hover:bg-amber-700'
                )}
                style={isActiveStreamIncomplete ? undefined : { backgroundColor: 'var(--theme-accent)' }}
              >
                {isActiveStreamIncomplete ? (
                  <AlertTriangle size={13} />
                ) : selectedFormat === 'copy' ? (
                  <Share2 size={13} />
                ) : (
                  <Download size={13} />
                )}
                <span>
                  {selectedFormat === 'copy'
                    ? 'Copy Now'
                    : isActiveStreamIncomplete
                    ? 'Download Incomplete File'
                    : 'Download / Export'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch "All (N)" Incomplete Stream Warning Modal */}
      {isBatchIncompleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[155] bg-black/52 backdrop-touch-lock flex items-center justify-center p-4"
          onClick={() => setIsBatchIncompleteConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden anim-pop-in mc-popup"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between gap-2 mc-popup-header"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <h3 className="text-sm font-semibold truncate mc-popup-title">
                  Incomplete Streams in Batch Export
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchIncompleteConfirmOpen(false)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                aria-label="Close warning"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <p className="opacity-85 leading-relaxed">
                Some subtitle streams included in this batch download are incomplete or contain translation errors:
              </p>
              <ul className="space-y-1 rounded-xl border p-2.5 font-mono text-[11px] bg-amber-500/10 border-amber-500/35 text-amber-500">
                {incompleteBatchStreamNames.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <p className="text-[11px] opacity-70">
                Download all {readyStreamsForBatch.length} streams anyway, or finish translating first?
              </p>
            </div>

            <div
              className="px-4 py-3 border-t flex items-center justify-end gap-2 mc-popup-footer"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <button
                type="button"
                onClick={() => setIsBatchIncompleteConfirmOpen(false)}
                className="min-h-[38px] px-3.5 rounded-xl border text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void executeBatchSaveAll();
                }}
                className="min-h-[38px] px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle size={13} />
                <span>Download Incomplete Batch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
