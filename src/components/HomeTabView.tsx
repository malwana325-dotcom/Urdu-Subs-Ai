import React, { useState, useRef, useMemo } from 'react';
import {
  FolderOpen,
  Globe,
  Sparkles,
  FileText,
  Save,
  Trash2,
  Copy,
  ArrowRight,
  RotateCcw,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Clapperboard,
  ChevronRight,
  Languages,
} from 'lucide-react';
import { CrashSnapshot, ProjectDraft } from '../services/db';
import { InfoPopover } from './InfoPopover';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { cn } from '../utils/cn';

interface HomeTabViewProps {
  fileName: string;
  detectedFormat: string;
  subtitlesCount: number;
  translatedCount: number;
  googleCount: number;
  activeDraftId: string | null;
  drafts: ProjectDraft[];
  crashSnapshot: CrashSnapshot | null;
  onRecoverCrash: () => void;
  onDismissCrash: () => void;
  onUploadFile: (file: File) => void;
  onLoadFromUrl: (url: string) => Promise<void>;
  onLoadDemo: () => void;
  onSaveCurrentAsDraft: (title: string) => Promise<void>;
  onLoadDraft: (draft: ProjectDraft) => void;
  onDuplicateDraft: (draft: ProjectDraft) => Promise<void>;
  onDeleteDraft: (id: string) => Promise<void>;
  onOpenWorkspace: () => void;
  onDiscardProject: () => void;
  onOpenAiCinema: () => void;
}

type PendingConfirmAction =
  | { type: 'delete-draft'; draftId: string; title: string }
  | { type: 'discard-active'; title: string }
  | { type: 'dismiss-crash'; title: string }
  | null;

export function deriveDraftTags(draft: ProjectDraft): string[] {
  if (Array.isArray(draft.tags) && draft.tags.length > 0) {
    return draft.tags;
  }
  const tags: string[] = [];
  const subs = draft.subtitles || [];
  const aiCount = draft.translatedCount || subs.filter((s) => Boolean(s.translatedText)).length;
  const gCount = draft.googleCount ?? subs.filter((s) => Boolean(s.googleTranslateText)).length;

  if (aiCount > 0) tags.push('AI');
  if (gCount > 0) tags.push('Neutral / Google');

  const hasBilingualLines = subs.some(
    (s) =>
      s.translatedText &&
      s.translatedText.includes('\n') &&
      /[a-zA-Z]/.test(s.translatedText) &&
      /[\u0600-\u06FF]/.test(s.translatedText)
  );
  if (
    hasBilingualLines ||
    draft.translationSettings?.scriptMode?.startsWith('bilingual') ||
    (aiCount > 0 && gCount > 0)
  ) {
    tags.push('Bilingual');
  }

  const hasUrdu = subs.some((s) => /[\u0600-\u06FF]/.test(s.translatedText || s.googleTranslateText || ''));
  const hasLatinTrans = subs.some(
    (s) =>
      (s.translatedText || s.googleTranslateText) &&
      /[a-zA-Z]/.test(s.translatedText || s.googleTranslateText || '') &&
      !/[\u0600-\u06FF]/.test(s.translatedText || s.googleTranslateText || '')
  );
  if (hasUrdu) tags.push('Urdu');
  else if (hasLatinTrans) tags.push('Roman');

  if (draft.detectedFormat) {
    const fmt = draft.detectedFormat.split(' ')[0].replace(/[^a-zA-Z0-9.]/g, '');
    if (fmt && !tags.includes(fmt)) tags.push(fmt);
  }
  return tags;
}

export const HomeTabView: React.FC<HomeTabViewProps> = ({
  fileName,
  detectedFormat,
  subtitlesCount,
  translatedCount,
  googleCount,
  activeDraftId,
  drafts,
  crashSnapshot,
  onRecoverCrash,
  onDismissCrash,
  onUploadFile,
  onLoadFromUrl,
  onLoadDemo,
  onSaveCurrentAsDraft,
  onLoadDraft,
  onDuplicateDraft,
  onDeleteDraft,
  onOpenWorkspace,
  onDiscardProject,
  onOpenAiCinema,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction>(null);
  const [tagFilter, setTagFilter] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasAnySubtitlesInApp = subtitlesCount > 0 || drafts.length > 0;

  const handleOpenLocalPicker = () => {
    fileInputRef.current?.click();
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => false);
      }
    } catch {
      // Scoped storage picker already invoked above
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError('Enter a valid subtitle URL (.srt, .vtt, .ass, .json).');
      return;
    }
    setUrlError(null);
    setIsFetchingUrl(true);
    try {
      await onLoadFromUrl(trimmed);
      setUrlInput('');
    } catch (err: any) {
      setUrlError(err?.message || 'Unable to fetch subtitle URL.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleSaveDraft = async () => {
    if (subtitlesCount === 0 || isSavingDraft) return;
    setIsSavingDraft(true);
    try {
      const title = draftTitle.trim() || fileName || `Draft ${new Date().toLocaleDateString()}`;
      await onSaveCurrentAsDraft(title);
      setDraftTitle('');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const filteredDrafts = drafts.filter((d) => {
    if (!draftSearch.trim()) return true;
    const q = draftSearch.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q);
  });

  const translatedItems = useMemo(() => {
    return drafts
      .map((d) => {
        const gCount = d.googleCount ?? (d.subtitles || []).filter((s) => Boolean(s.googleTranslateText)).length;
        const aiCount = d.translatedCount || (d.subtitles || []).filter((s) => Boolean(s.translatedText)).length;
        const tags = deriveDraftTags(d);
        return { draft: d, aiCount, gCount, tags };
      })
      .filter((entry) => entry.aiCount > 0 || entry.gCount > 0);
  }, [drafts]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    translatedItems.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return ['All', ...Array.from(set)];
  }, [translatedItems]);

  const filteredTranslatedItems = useMemo(() => {
    if (tagFilter === 'All') return translatedItems;
    return translatedItems.filter((item) => item.tags.includes(tagFilter));
  }, [translatedItems, tagFilter]);

  const formatTimeAgo = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const executePendingConfirm = async () => {
    if (!pendingConfirm) return;
    const action = pendingConfirm;
    setPendingConfirm(null);
    if (action.type === 'delete-draft') {
      await onDeleteDraft(action.draftId);
    } else if (action.type === 'discard-active') {
      onDiscardProject();
    } else if (action.type === 'dismiss-crash') {
      onDismissCrash();
    }
  };

  return (
    <div className="space-y-3 max-w-5xl mx-auto w-full">
      {/* Crash-Safe Auto-Save Recovery */}
      {crashSnapshot && crashSnapshot.subtitles && crashSnapshot.subtitles.length > 0 && (
        <div
          className="rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          style={{
            backgroundColor: 'var(--theme-accent-soft)',
            borderColor: 'var(--theme-accent)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <RotateCcw size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">
                Recovery Ready · {crashSnapshot.fileName || 'Untitled'}
              </p>
              <p className="text-[11px] opacity-70 font-mono tabular-nums">
                {crashSnapshot.subtitles.length} lines · {formatTimeAgo(crashSnapshot.savedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onRecoverCrash}
              className="min-h-[36px] px-3 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <CheckCircle2 size={14} />
              <span className="truncate">Recover</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setPendingConfirm({
                  type: 'dismiss-crash',
                  title: crashSnapshot.fileName || 'Recovery Snapshot',
                })
              }
              className="min-h-[36px] px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <span className="truncate">Dismiss</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Workspace Session */}
      {subtitlesCount > 0 && (
        <div
          className="rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 theme-card"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            padding: 'var(--card-pad)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText size={17} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-semibold truncate" title={fileName}>
                  {fileName || 'Untitled Project'}
                </h2>
                <InfoPopover
                  title="Active Session"
                  description="Your active subtitle script. Open in Workspace to edit or Clear to start fresh."
                  align="left"
                />
              </div>
              <p className="text-[11px] opacity-65 font-mono tabular-nums truncate">
                {detectedFormat ? `${detectedFormat} · ` : ''}
                {subtitlesCount} lines · {translatedCount} AI · {googleCount} Neutral
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="min-h-[36px] px-3 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <span className="truncate">Open</span>
              <ArrowRight size={13} className="shrink-0" />
            </button>

            <button
              type="button"
              onClick={() =>
                setPendingConfirm({
                  type: 'discard-active',
                  title: fileName || 'Active Subtitle Workspace',
                })
              }
              className="min-h-[36px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors touch-tactile text-red-500 hover:bg-red-500/10 btn-inch-cap"
              style={{ borderColor: 'var(--theme-border)' }}
              title="Clear workspace"
            >
              <Trash2 size={13} className="shrink-0" />
              <span className="truncate">Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Sources (Flat 2-Column Studio Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Local File Picker */}
        <div
          className="rounded-xl border space-y-2.5 theme-card flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            padding: 'var(--card-pad)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <h3 className="text-xs sm:text-sm font-semibold truncate">Local File</h3>
            </div>
            <InfoPopover
              title="Local Storage Import"
              description="Open SRT, VTT, ASS, SSA, SBV, LRC, JSON, or TXT files directly from device storage."
              details={['Works 100% offline', 'Opens directly into Workspace']}
              align="right"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt,.ass,.ssa,.sbv,.lrc,.json,.txt,text/vtt,text/plain,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file) onUploadFile(file);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={handleOpenLocalPicker}
              className="min-h-[38px] px-3 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <HardDrive size={14} className="shrink-0" />
              <span className="truncate">Browse</span>
            </button>

            {/* Show Demo Subtitles ONLY when no subtitles are present in the app */}
            {!hasAnySubtitlesInApp && (
              <button
                type="button"
                onClick={onLoadDemo}
                className="min-h-[38px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                <Sparkles size={13} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                <span className="truncate">Demo</span>
              </button>
            )}
          </div>
        </div>

        {/* Direct URL Fetch */}
        <form
          onSubmit={handleUrlSubmit}
          className="rounded-xl border space-y-2.5 theme-card flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            padding: 'var(--card-pad)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Globe size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              <h3 className="text-xs sm:text-sm font-semibold truncate">URL Import</h3>
            </div>
            <InfoPopover
              title="Import from URL"
              description="Fetch any direct CORS-enabled .srt, .vtt, .ass, or .json subtitle link."
              align="right"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://example.com/captions.srt"
                className="flex-1 min-w-0 min-h-[40px] px-3 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
              <button
                type="submit"
                disabled={isFetchingUrl}
                className="min-h-[40px] px-3 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer shrink-0 disabled:opacity-50 touch-tactile btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                {isFetchingUrl ? <Loader2 size={14} className="animate-spin shrink-0" /> : <ArrowRight size={14} className="shrink-0" />}
                <span className="truncate">{isFetchingUrl ? 'Loading' : 'Fetch'}</span>
              </button>
            </div>
            {urlError && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-500">
                <AlertCircle size={13} className="shrink-0" />
                <span className="truncate">{urlError}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Translated Subtitles List with Tags (AI, Neutral/Google, Bilingual, etc.) */}
      <div
        className="rounded-xl border space-y-2.5 theme-card"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Languages size={15} style={{ color: 'var(--theme-accent)' }} />
            <h3 className="text-xs sm:text-sm font-semibold">Translated Subtitles</h3>
            <span className="text-[11px] font-mono opacity-55 tabular-nums">· {translatedItems.length}</span>
            <InfoPopover
              title="Translated Subtitles Library"
              description="Saved subtitle projects with completed or partial AI, Neutral (Google), or Bilingual translations."
              align="left"
            />
          </div>

          {availableTags.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              {availableTags.map((tag) => {
                const active = tagFilter === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(tag)}
                    className={cn(
                      'px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors',
                      active ? 'text-white' : 'opacity-70 hover:opacity-100'
                    )}
                    style={
                      active
                        ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {filteredTranslatedItems.length === 0 ? (
          <div className="py-4 text-center text-[11px] opacity-60 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {translatedItems.length === 0
              ? 'No translated subtitle drafts saved yet. Translate a file and save a draft to list it here.'
              : `No translated subtitles tagged "${tagFilter}".`}
          </div>
        ) : (
          <div className="divide-y border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {filteredTranslatedItems.map(({ draft, aiCount, gCount, tags }) => {
              const isOpened = activeDraftId === draft.id;
              return (
                <div
                  key={`trans-${draft.id}`}
                  className="py-2 px-2 -mx-2 rounded-lg flex items-center justify-between gap-2 transition-colors"
                  style={
                    isOpened
                      ? { backgroundColor: 'var(--theme-accent-soft)' }
                      : undefined
                  }
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="text-xs font-semibold truncate" title={draft.title}>
                        {draft.title}
                      </h4>
                      {isOpened && (
                        <span
                          className="text-[10px] font-semibold shrink-0"
                          style={{ color: 'var(--theme-accent-text)' }}
                        >
                          · Opened
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] opacity-75 flex-wrap">
                      <span className="font-mono tabular-nums opacity-70">
                        {aiCount}/{draft.subtitleCount} AI · {gCount}/{draft.subtitleCount} Neutral
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium opacity-85">{tags.join(' · ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadDraft(draft)}
                      className="min-h-[32px] px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile btn-inch-cap"
                      style={{ backgroundColor: 'var(--theme-accent)' }}
                    >
                      <ArrowRight size={12} className="shrink-0" />
                      <span className="truncate">{isOpened ? 'Open' : 'Load'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingConfirm({
                          type: 'delete-draft',
                          draftId: draft.id,
                          title: draft.title || draft.fileName,
                        })
                      }
                      className="min-h-[32px] px-2 rounded-lg border text-[11px] font-semibold text-red-500 hover:bg-red-500/10 flex items-center justify-center cursor-pointer touch-tactile"
                      style={{ borderColor: 'var(--theme-border)' }}
                      title="Delete translated subtitle"
                      aria-label={`Delete ${draft.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved Drafts */}
      <div
        className="rounded-xl border space-y-2.5 theme-card"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Save size={15} style={{ color: 'var(--theme-accent)' }} />
            <h3 className="text-xs sm:text-sm font-semibold">Saved Drafts</h3>
            <span className="text-[11px] font-mono opacity-55 tabular-nums">· {drafts.length}</span>
            <InfoPopover
              title="Project Drafts"
              description="Offline IndexedDB snapshots of timelines, translations, and styling settings."
              align="left"
            />
          </div>

          {drafts.length > 2 && (
            <div className="relative w-full sm:w-48">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
              <input
                type="text"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                placeholder="Filter drafts..."
                className="w-full min-h-[34px] pl-7 pr-2.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
            </div>
          )}
        </div>

        {subtitlesCount > 0 && (
          <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder={fileName ? `Save snapshot (${fileName})` : 'Draft title...'}
              className="flex-1 min-w-0 min-h-[38px] px-3 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
              style={{
                backgroundColor: 'var(--theme-elevated)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            />
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="min-h-[38px] px-3 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 touch-tactile btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              {isSavingDraft ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Save size={13} className="shrink-0" />}
              <span className="truncate">Save</span>
            </button>
          </div>
        )}

        {filteredDrafts.length === 0 ? (
          <div className="py-5 text-center text-[11px] opacity-60 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {drafts.length === 0 ? 'No saved drafts yet.' : 'No matching drafts.'}
          </div>
        ) : (
          <div className="divide-y border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {filteredDrafts.map((draft) => {
              const isOpened = activeDraftId === draft.id;
              return (
                <div
                  key={draft.id}
                  className={cn(
                    'py-2 px-2 -mx-2 rounded-lg flex items-center justify-between gap-2 transition-colors',
                    isOpened && 'ring-1 ring-[var(--theme-accent)]'
                  )}
                  style={{
                    borderColor: 'var(--theme-border)',
                    backgroundColor: isOpened ? 'var(--theme-accent-soft)' : undefined,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="text-xs font-semibold truncate" title={draft.title}>
                        {draft.title}
                      </h4>
                      {isOpened && (
                        <span
                          className="text-[10px] font-semibold shrink-0"
                          style={{ color: 'var(--theme-accent-text)' }}
                        >
                          · Active
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] opacity-60 font-mono tabular-nums truncate">
                      {draft.sourceType.toUpperCase()} · {draft.translatedCount}/{draft.subtitleCount} · {formatTimeAgo(draft.updatedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadDraft(draft)}
                      className="min-h-[34px] px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile btn-inch-cap"
                      style={{ backgroundColor: 'var(--theme-accent)' }}
                      title={isOpened ? 'Opened in Workspace' : 'Load draft'}
                    >
                      <ArrowRight size={12} className="shrink-0" />
                      <span className="truncate">{isOpened ? 'Opened' : 'Load'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateDraft(draft)}
                      className="w-[34px] h-[34px] rounded-lg border flex items-center justify-center cursor-pointer opacity-75 hover:opacity-100 touch-tactile"
                      style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                      title="Duplicate"
                      aria-label="Duplicate draft"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingConfirm({
                          type: 'delete-draft',
                          draftId: draft.id,
                          title: draft.title || draft.fileName,
                        })
                      }
                      className="min-h-[34px] px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors touch-tactile text-red-500 hover:bg-red-500/10"
                      style={{ borderColor: 'var(--theme-border)' }}
                      title="Delete draft"
                      aria-label="Delete draft"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* More Tools (AI Cinema Studio) */}
      <div
        className="w-full rounded-xl border flex items-center justify-between gap-2 theme-card"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Clapperboard size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
          <span className="text-xs sm:text-sm font-semibold truncate">AI Cinema Studio</span>
          <InfoPopover
            title="AI Cinema Studio"
            description="Look up movie or series cast, genders, and tone via Gemini web grounding and apply to Cultural Context."
            align="left"
          />
        </div>
        <button
          type="button"
          onClick={onOpenAiCinema}
          className="min-h-[34px] px-3 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer touch-tactile shrink-0 btn-inch-cap"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <span className="truncate">Open</span>
          <ChevronRight size={13} className="opacity-70 shrink-0" />
        </button>
      </div>

      {/* Yes / No Confirmation Dialog for Delete / Clear / Dismiss */}
      <ConfirmDialogModal
        isOpen={pendingConfirm !== null}
        title={
          pendingConfirm?.type === 'delete-draft'
            ? 'Delete Draft?'
            : pendingConfirm?.type === 'discard-active'
            ? 'Clear Active Workspace?'
            : 'Dismiss Recovery Snapshot?'
        }
        message={
          pendingConfirm?.type === 'delete-draft'
            ? `Are you sure you want to permanently delete "${pendingConfirm.title}"?`
            : pendingConfirm?.type === 'discard-active'
            ? `Are you sure you want to clear "${pendingConfirm.title}" from the workspace? Unsaved changes will be lost.`
            : 'Are you sure you want to discard the crash recovery snapshot?'
        }
        confirmLabel="Yes"
        cancelLabel="No"
        danger
        onConfirm={() => {
          void executePendingConfirm();
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
};
