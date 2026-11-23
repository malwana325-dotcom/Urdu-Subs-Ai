import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Globe,
  Languages,
} from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import { dbService } from '../services/db';
import {
  TranslationSettings,
  TARGET_LANGUAGES,
  SCRIPT_MODES,
  DEFAULT_TRANSLATION_SETTINGS,
} from '../services/translationSettings';
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
}

interface DownloadTabViewProps {
  subtitles: SubtitleItem[];
  fileName: string;
  detectedFormat: string;
  translationSettings?: TranslationSettings;
  isTranslating?: boolean;
  isGoogleTranslatingAll?: boolean;
  onDownloadFormatted: (
    format: DownloadFormat,
    type: 'ai' | 'google' | 'original',
    folderTarget?: ExportFolderTarget
  ) => void;
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
  detectedFormat,
  translationSettings = DEFAULT_TRANSLATION_SETTINGS,
  isTranslating = false,
  isGoogleTranslatingAll = false,
  onDownloadFormatted,
  onRefreshDownloadSession,
}) => {
  const [selectedStream, setSelectedStream] = useState<'ai' | 'google' | 'original'>('ai');
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>('srt-formatted');
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const [selectedDirHandle, setSelectedDirHandle] = useState<any | null>(null);
  const [selectedDirName, setSelectedDirName] = useState<string>('');
  const [folderStatusNote, setFolderStatusNote] = useState<string | null>(null);
  const [isExportOverlayOpen, setIsExportOverlayOpen] = useState(false);

  const supportsDirectoryPicker =
    typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

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
    if (!isExportOverlayOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportOverlayOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExportOverlayOpen]);

  const handleSelectExportFolder = async () => {
    setFolderStatusNote(null);
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
    setSelectedDirHandle(null);
    setSelectedDirName('');
    setFolderStatusNote(null);
    await dbService.saveDirectoryHandle(EXPORT_DIR_KEY, null).catch(() => {});
  };

  const totalCount = subtitles.length;
  const translatedCount = subtitles.filter((s) => Boolean(s.translatedText?.trim())).length;
  const googleCount = subtitles.filter(
    (s) => Boolean(s.googleTranslateText?.trim()) && s.googleTranslateText !== 'Translation Error'
  ).length;
  const activeOption = DOWNLOAD_OPTIONS.find((o) => o.format === selectedFormat) || DOWNLOAD_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  // Derive translation state, stream label, and language label for pre-export overlay
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

  const completionPercent = totalCount > 0 ? Math.round((activeCompletedCount / totalCount) * 100) : 0;
  const isStreamTranslating =
    (selectedStream === 'ai' && isTranslating) ||
    (selectedStream === 'google' && isGoogleTranslatingAll);

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
        detail: `${activeCompletedCount} of ${totalCount} blocks translated so far (${completionPercent}%). Remaining blocks may be empty or fallback.`,
      };
    }
    if (totalCount > 0 && activeCompletedCount === totalCount) {
      return {
        state: 'complete' as const,
        title: 'Translation Completed',
        detail: `All ${totalCount} of ${totalCount} subtitle blocks are translated (100%).`,
      };
    }
    if (activeCompletedCount > 0) {
      return {
        state: 'partial' as const,
        title: 'Translation Incomplete',
        detail: `${activeCompletedCount} of ${totalCount} blocks translated (${completionPercent}%). ${
          totalCount - activeCompletedCount
        } block(s) still untranslated.`,
      };
    }
    return {
      state: 'empty' as const,
      title: 'Not Translated Yet',
      detail: `0 of ${totalCount} blocks translated in ${streamLabel}.`,
    };
  })();

  const handleConfirmExport = () => {
    setIsExportOverlayOpen(false);
    onDownloadFormatted(
      selectedFormat,
      selectedStream,
      selectedDirHandle ? { directoryHandle: selectedDirHandle, dirName: selectedDirName } : undefined
    );
  };

  return (
    <div className="space-y-3 max-w-5xl mx-auto w-full pb-16">
      {/* Stream Selector */}
      <div
        className="rounded-xl border space-y-2.5 theme-card"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Download size={15} style={{ color: 'var(--theme-accent)' }} />
              <h2 className="text-xs sm:text-sm font-semibold truncate">Export Subtitles</h2>
              <InfoPopover
                title="UTF-8 BOM & Offline Export"
                description="Exports use UTF-8 BOM so Urdu Nastaliq renders sharply in VLC, MX Player, and Android Share."
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
              { id: 'google', label: 'Google', count: googleCount },
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

      {/* Drop-Down Export Menu & Destination Folder */}
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
            className="rounded-xl border space-y-3 theme-card"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              padding: 'var(--card-pad)',
            }}
          >
            {/* Export Format Drop-Down Menu */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold opacity-75 block">Export Format</label>
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
                    className="mt-1.5 rounded-xl border overflow-hidden divide-y max-h-72 overflow-y-auto shadow-lg"
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

            {/* Destination Folder Selector */}
            {selectedFormat !== 'copy' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold opacity-75 block">Destination Folder</label>
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
                          ? 'Exports write directly into this selected folder'
                          : supportsDirectoryPicker
                          ? 'Tap Folder to save directly to a custom directory'
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
                {folderStatusNote && <p className="text-[10px] opacity-70 px-1">{folderStatusNote}</p>}
              </div>
            )}
          </div>

          {/* Bottom Docked Export Action Bar */}
          <div
            className="sticky bottom-[60px] lg:bottom-3 z-20 rounded-xl border px-3 py-2.5 shadow-lg flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                <span>{streamLabel}</span>
                <span className="text-[10px] font-mono opacity-60">{activeOption.ext}</span>
              </div>
              <p className="text-[10px] font-mono opacity-65 truncate tabular-nums">
                {languageLabel} · {activeCompletedCount}/{totalCount} ({completionPercent}%)
              </p>
            </div>

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
        </>
      )}

      {/* Pre-Export Pop-Up Overlay */}
      {isExportOverlayOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/55 backdrop-blur-md backdrop-touch-lock flex items-center justify-center p-4"
          onClick={() => setIsExportOverlayOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-overlay-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b flex items-center justify-between gap-2"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Download size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                <h3 id="export-overlay-title" className="text-sm font-semibold truncate">
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
                  <span className="opacity-65 flex items-center gap-1.5">
                    <FileText size={13} style={{ color: 'var(--theme-accent)' }} />
                    <span>Format</span>
                  </span>
                  <span className="font-semibold font-mono text-right">
                    {activeOption.name} ({activeOption.ext})
                  </span>
                </div>
                {selectedFormat !== 'copy' && (
                  <div className="px-3 py-2 flex items-center justify-between gap-2">
                    <span className="opacity-65 flex items-center gap-1.5">
                      <FolderOpen size={13} style={{ color: 'var(--theme-accent)' }} />
                      <span>Destination</span>
                    </span>
                    <span className="font-semibold text-right truncate max-w-[200px]">
                      {selectedDirName || 'Device Downloads / Share'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 border-t flex items-center justify-end gap-2"
              style={{ borderColor: 'var(--theme-border)' }}
            >
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
                className="min-h-[38px] px-4 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                {selectedFormat === 'copy' ? <Share2 size={13} /> : <Download size={13} />}
                <span>{selectedFormat === 'copy' ? 'Copy Now' : 'Download / Export'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
