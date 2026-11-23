import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  FolderOpen,
  RefreshCw,
  FileText,
  Search,
  Trash2,
  Upload,
  FolderPlus,
  HardDrive,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { dbService, StoredSubtitleFile } from '../services/db';
import { InfoPopover } from './InfoPopover';
import { RightEdgeDrawerShell } from './RightEdgeDrawerShell';
import { cn } from '../utils/cn';

const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa', '.sbv', '.lrc', '.json', '.txt'];

function hasSubtitleExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return SUBTITLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function detectExtLabel(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'TXT';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface MySubtitlesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadFile: (file: File) => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'saved' | 'not-saved') => void;
}

export const MySubtitlesDrawer: React.FC<MySubtitlesDrawerProps> = ({
  isOpen,
  onClose,
  onLoadFile,
  onNotify,
}) => {
  const [files, setFiles] = useState<StoredSubtitleFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderLabel, setFolderLabel] = useState<string>('My Subtitles');
  const [isScanning, setIsScanning] = useState(false);
  const [hasSavedHandle, setHasSavedHandle] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const supportsDirectoryPicker =
    typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

  const loadCachedFiles = useCallback(async () => {
    try {
      const [cached, savedHandle] = await Promise.all([
        dbService.listMySubtitlesFiles(),
        dbService.loadDirectoryHandle('my_subtitles_dir').catch(() => null),
      ]);
      setFiles(cached);
      if (savedHandle) {
        setHasSavedHandle(true);
        setFolderLabel(savedHandle.name || 'My Subtitles');
      } else if (cached.length > 0 && cached[0].folderName) {
        setFolderLabel(cached[0].folderName);
      }
    } catch {
      // Ignore initial IndexedDB errors
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCachedFiles();
    }
  }, [isOpen, loadCachedFiles]);

  const scanDirectoryHandle = useCallback(
    async (rootHandle: any, replaceExisting = true): Promise<StoredSubtitleFile[]> => {
      let targetHandle = rootHandle;
      let resolvedFolderName = rootHandle.name || 'My Subtitles';

      // If user picked a parent folder (e.g. Downloads or Documents), automatically scope to "My Subtitles" if present
      if (!/my\s*subtitles/i.test(resolvedFolderName)) {
        try {
          for await (const entry of rootHandle.values()) {
            if (entry.kind === 'directory' && /^my\s*subtitles$/i.test(entry.name)) {
              targetHandle = entry;
              resolvedFolderName = entry.name;
              break;
            }
          }
        } catch {
          // Proceed with selected handle
        }
      }

      const collected: StoredSubtitleFile[] = [];

      const walkDir = async (dirHandle: any, prefix: string, depth: number) => {
        if (depth > 3) return;
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && hasSubtitleExtension(entry.name)) {
            try {
              const file: File = await entry.getFile();
              const content = await file.text();
              const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
              collected.push({
                id: `${resolvedFolderName}::${relPath}`,
                name: entry.name,
                folderName: resolvedFolderName,
                relativePath: relPath,
                format: detectExtLabel(entry.name),
                sizeBytes: file.size,
                lastModified: file.lastModified || Date.now(),
                content,
                addedAt: new Date().toISOString(),
              });
            } catch {
              // Skip unreadable file
            }
          } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
            await walkDir(entry, prefix ? `${prefix}/${entry.name}` : entry.name, depth + 1);
          }
        }
      };

      await walkDir(targetHandle, '', 0);
      collected.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

      if (replaceExisting) {
        await dbService.replaceMySubtitlesFiles(collected);
      } else if (collected.length > 0) {
        await dbService.saveMySubtitlesFiles(collected);
      }
      await dbService.saveDirectoryHandle('my_subtitles_dir', targetHandle).catch(() => {});
      setHasSavedHandle(true);
      setFolderLabel(resolvedFolderName);
      setFiles(collected);
      return collected;
    },
    []
  );

  const handleLinkDirectory = async () => {
    setStatusMessage(null);
    if (supportsDirectoryPicker) {
      setIsScanning(true);
      try {
        const picked = await (window as any).showDirectoryPicker({ mode: 'read' });
        const found = await scanDirectoryHandle(picked, true);
        if (found.length === 0) {
          setStatusMessage('No subtitle files found in selected folder.');
          onNotify?.('No subtitle files found in folder', 'warning');
        } else {
          setStatusMessage(`Loaded ${found.length} subtitle file(s) from ${picked.name}.`);
          onNotify?.(`Synced ${found.length} file(s) from My Subtitles`, 'success');
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          folderInputRef.current?.click();
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  const handleRescanSavedFolder = async () => {
    setIsScanning(true);
    setStatusMessage(null);
    try {
      const savedHandle = await dbService.loadDirectoryHandle('my_subtitles_dir');
      if (!savedHandle) {
        await loadCachedFiles();
        setIsScanning(false);
        return;
      }
      if (typeof savedHandle.queryPermission === 'function') {
        let perm = await savedHandle.queryPermission({ mode: 'read' });
        if (perm !== 'granted' && typeof savedHandle.requestPermission === 'function') {
          perm = await savedHandle.requestPermission({ mode: 'read' });
        }
        if (perm !== 'granted') {
          setStatusMessage('Folder permission needed. Tap Link Folder.');
          setIsScanning(false);
          return;
        }
      }
      const found = await scanDirectoryHandle(savedHandle, true);
      onNotify?.(`Refreshed ${found.length} file(s) in ${savedHandle.name}`, 'success');
    } catch {
      await loadCachedFiles();
      setStatusMessage('Could not access saved folder directly; showing cached files.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFilesSelected = async (fileList: FileList | null, fromFolderPicker: boolean) => {
    if (!fileList || fileList.length === 0) return;
    setIsScanning(true);
    setStatusMessage(null);
    try {
      const rawFiles = Array.from(fileList).filter((f) => hasSubtitleExtension(f.name));
      if (rawFiles.length === 0) {
        setStatusMessage('No supported subtitle files (.srt, .vtt, .ass, .ssa, .sbv, .lrc, .json, .txt) found.');
        onNotify?.('No supported subtitle files found', 'warning');
        setIsScanning(false);
        return;
      }

      // If folder picker was used, prefer files inside "My Subtitles" subfolder if present
      const mySubMatch = rawFiles.filter((f) => {
        const rel = (f as any).webkitRelativePath || '';
        return /(^|\/)my\s*subtitles(\/|$)/i.test(rel);
      });
      const filesToUse = mySubMatch.length > 0 ? mySubMatch : rawFiles;
      const detectedFolder = (() => {
        const firstRel = ((filesToUse[0] as any).webkitRelativePath || '') as string;
        if (mySubMatch.length > 0) return 'My Subtitles';
        if (firstRel.includes('/')) return firstRel.split('/')[0];
        return 'My Subtitles';
      })();

      const stored: StoredSubtitleFile[] = [];
      for (const f of filesToUse) {
        const content = await f.text();
        const relPath = ((f as any).webkitRelativePath || f.name) as string;
        stored.push({
          id: `${detectedFolder}::${relPath}`,
          name: f.name,
          folderName: detectedFolder,
          relativePath: relPath,
          format: detectExtLabel(f.name),
          sizeBytes: f.size,
          lastModified: f.lastModified || Date.now(),
          content,
          addedAt: new Date().toISOString(),
        });
      }

      if (fromFolderPicker) {
        await dbService.replaceMySubtitlesFiles(stored);
        setFiles(stored);
      } else {
        await dbService.saveMySubtitlesFiles(stored);
        const merged = await dbService.listMySubtitlesFiles();
        setFiles(merged);
      }
      setFolderLabel(detectedFolder);
      setStatusMessage(`Added ${stored.length} subtitle file(s) to ${detectedFolder}.`);
      onNotify?.(`Added ${stored.length} file(s) to ${detectedFolder}`, 'success');
    } catch {
      setStatusMessage('Unable to read selected subtitle files.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenStoredFile = (item: StoredSubtitleFile) => {
    const file = new File([item.content], item.name, {
      type: 'text/plain',
      lastModified: item.lastModified || Date.now(),
    });
    onLoadFile(file);
    onClose();
  };

  const handleRemoveFile = async (id: string) => {
    if (confirmRemoveId === id) {
      await dbService.deleteMySubtitleFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setConfirmRemoveId(null);
      onNotify?.('Removed file from My Subtitles list', 'success');
    } else {
      setConfirmRemoveId(id);
      setTimeout(() => setConfirmRemoveId((cur) => (cur === id ? null : cur)), 3000);
    }
  };

  const filteredFiles = files.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q);
  });

  return (
    <RightEdgeDrawerShell isOpen={isOpen} onClose={onClose} widthClass="w-[min(92vw,370px)]">
        {/* Header */}
        <div
          className="px-3 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="text-xs font-semibold truncate">{folderLabel}</h2>
                <InfoPopover
                  title="My Subtitles Folder"
                  description="Browse and load subtitle files stored in your My Subtitles folder on device storage or offline cache."
                  align="right"
                />
              </div>
              <p className="text-[10px] opacity-60 font-mono tabular-nums truncate">
                {files.length} subtitle {files.length === 1 ? 'file' : 'files'}
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

        {/* Folder Controls */}
        <div className="p-2.5 border-b space-y-2 shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleLinkDirectory}
              disabled={isScanning}
              className="min-h-[36px] px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {isScanning ? <Loader2 size={13} className="animate-spin shrink-0" /> : <FolderPlus size={13} className="shrink-0" />}
              <span className="truncate">Folder</span>
            </button>

            <button
              type="button"
              onClick={() => multiFileInputRef.current?.click()}
              disabled={isScanning}
              className="min-h-[36px] px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <Upload size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <span className="truncate">Add Files</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search My Subtitles..."
                className="w-full min-h-[36px] pl-7 pr-2.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
            </div>

            {hasSavedHandle && (
              <button
                type="button"
                onClick={handleRescanSavedFolder}
                disabled={isScanning}
                className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title="Refresh folder"
                aria-label="Refresh folder"
              >
                <RefreshCw size={13} className={cn(isScanning && 'animate-spin')} />
              </button>
            )}
          </div>

          {statusMessage && (
            <p className="text-[10.5px] opacity-75 leading-snug">{statusMessage}</p>
          )}

          {/* Hidden Inputs for Folder / Multi-file Selection on Android & Browsers */}
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: '', directory: '' } as any)}
            onChange={(e) => {
              handleFilesSelected(e.target.files, true);
              e.target.value = '';
            }}
            className="hidden"
          />
          <input
            ref={multiFileInputRef}
            type="file"
            multiple
            accept=".srt,.vtt,.ass,.ssa,.sbv,.lrc,.json,.txt,text/vtt,text/plain,application/json"
            onChange={(e) => {
              handleFilesSelected(e.target.files, false);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {filteredFiles.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2.5">
              <div
                className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center"
                style={{ backgroundColor: 'var(--theme-accent-soft)', color: 'var(--theme-accent)' }}
              >
                <HardDrive size={18} />
              </div>
              <p className="text-xs font-semibold">
                {files.length === 0 ? 'No Files in My Subtitles' : 'No Matching Files'}
              </p>
              <p className="text-[11px] opacity-60 leading-relaxed">
                Tap Select Folder to link your My Subtitles directory or Add Files to store subtitles for instant loading.
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-lg border p-2 flex items-center justify-between gap-2"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <FileText size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" title={file.relativePath}>
                      {file.name}
                    </p>
                    <p className="text-[10px] opacity-60 font-mono tabular-nums truncate">
                      {file.format} · {formatBytes(file.sizeBytes)}
                      {file.relativePath !== file.name ? ` · ${file.relativePath}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenStoredFile(file)}
                    className="min-h-[34px] px-2.5 rounded-md text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile btn-inch-cap"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                  >
                    <span className="truncate">Load</span>
                    <ArrowRight size={11} className="shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className={cn(
                      'min-h-[34px] px-2 rounded-md border text-[10px] font-semibold flex items-center justify-center cursor-pointer transition-colors',
                      confirmRemoveId === file.id
                        ? 'bg-red-600 text-white border-red-600'
                        : 'text-red-500 hover:bg-red-500/10'
                    )}
                    style={confirmRemoveId === file.id ? undefined : { borderColor: 'var(--theme-border)' }}
                    title="Remove from list"
                    aria-label="Remove file"
                  >
                    {confirmRemoveId === file.id ? <span>Confirm</span> : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
    </RightEdgeDrawerShell>
  );
};
