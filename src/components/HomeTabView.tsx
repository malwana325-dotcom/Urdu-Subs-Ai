import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  AlertTriangle,
  HardDrive,
  Clapperboard,
  ChevronRight,
  Languages,
  MoreVertical,
  Pencil,
  FolderInput,
  X,
  Check,
  ChevronDown,
  History,
} from 'lucide-react';
import {
  CrashSnapshot,
  ProjectDraft,
  ProjectDraftVersion,
  ProjectListPlacement,
  StoredSubtitleFile,
} from '../services/db';
import {
  isNativeAndroid,
  getAndroidPermissionSnapshot,
  requestAndroidStoragePermission,
} from '../services/androidNative';
import { InfoPopover } from './InfoPopover';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { ResponsiveLazyImage } from './ResponsiveLazyImage';
import { registerBackHandler } from '../utils/backNavigation';
import { refineSubtitleName } from '../utils/exportCategorizer';
import {
  evaluateProjectTagsAndCompletion,
  getDraftPlacements,
  getSortedDraftVersions,
  deriveStoredFileTags,
  getDisplayStoredFileTitle,
  EvaluatedProjectInfo,
  OptionTagDescriptor,
} from '../utils/projectTags';
import { cn } from '../utils/cn';
import studioHeroBackdrop from '../assets/images/studio_hero_backdrop_1795665458553.jpg';
import urduStudioEmblem from '../assets/images/urdu_studio_emblem_1795665457910.jpg';

interface HomeTabViewProps {
  fileName: string;
  syncedBaseTitle?: string;
  detectedFormat: string;
  subtitlesCount: number;
  translatedCount: number;
  googleCount: number;
  activeDraftId: string | null;
  drafts: ProjectDraft[];
  mySubtitlesFiles?: StoredSubtitleFile[];
  crashSnapshot: CrashSnapshot | null;
  onRecoverCrash: () => void;
  onDismissCrash: () => void;
  onUploadFile: (file: File) => void;
  onLoadFromUrl: (url: string) => Promise<void>;
  onLoadDemo: () => void;
  onSaveCurrentAsDraft: (title: string) => Promise<void>;
  onLoadDraft: (draft: ProjectDraft) => void;
  onLoadDraftVersion?: (draft: ProjectDraft, version: ProjectDraftVersion) => void;
  onRestoreDraft?: (draft: ProjectDraft) => Promise<void>;
  onDuplicateDraft: (draft: ProjectDraft) => Promise<void>;
  onRenameDraft?: (draft: ProjectDraft, newTitle: string) => Promise<void>;
  onMoveDraft?: (draft: ProjectDraft, targetList: ProjectListPlacement) => Promise<void>;
  onDeleteDraft: (id: string) => Promise<void>;
  onOpenMySubtitleFile?: (file: StoredSubtitleFile) => void;
  onRenameMySubtitleFile?: (file: StoredSubtitleFile, newTitle: string) => Promise<void>;
  onMoveMySubtitleFile?: (file: StoredSubtitleFile, targetFolder: string) => Promise<void>;
  onDeleteMySubtitleFile?: (id: string) => Promise<void>;
  onOpenMySubtitlesDrawer?: () => void;
  onOpenWorkspace: () => void;
  onDiscardProject: () => void;
  onOpenAiCinema: () => void;
  isHeavyTranslationActive?: boolean;
}

type PendingConfirmAction =
  | { type: 'delete-draft'; draftId: string; title: string }
  | { type: 'delete-my-file'; fileId: string; title: string }
  | { type: 'discard-active'; title: string }
  | { type: 'dismiss-crash'; title: string }
  | null;

type MenuTarget =
  | { list: 'translated' | 'drafts' | 'my-subtitles'; kind: 'draft'; draft: ProjectDraft; displayTitle: string }
  | { list: 'my-subtitles'; kind: 'stored-file'; file: StoredSubtitleFile; displayTitle: string };

type RenameModalState =
  | { kind: 'draft'; draft: ProjectDraft; value: string }
  | { kind: 'stored-file'; file: StoredSubtitleFile; value: string }
  | null;

type MoveModalState =
  | { kind: 'draft'; draft: ProjectDraft; currentList: 'translated' | 'drafts' | 'my-subtitles'; displayTitle: string }
  | { kind: 'stored-file'; file: StoredSubtitleFile; displayTitle: string }
  | null;

const MY_SUBTITLE_CATEGORIES = [
  'Exports',
  'Urdu (AI)',
  'Urdu (Neutral)',
  'Bilingual',
  'Edited',
  'Archive',
];

export function deriveDraftTags(draft: ProjectDraft): string[] {
  return evaluateProjectTagsAndCompletion(draft).filterTags;
}

const ProjectTagsRow: React.FC<{
  isCompleted: boolean;
  optionTags: OptionTagDescriptor[];
  compact?: boolean;
}> = ({ isCompleted, optionTags, compact = false }) => {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Progress Status Tag */}
      {isCompleted ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border font-semibold shrink-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/35',
            compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-1.5 py-0.5 text-[9.5px]'
          )}
          title="All translations and selected options completed"
        >
          <CheckCircle2 size={10} className="shrink-0 text-emerald-500" />
          <span>Completed</span>
        </span>
      ) : (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border font-semibold shrink-0 bg-red-500/15 text-red-500 border-red-500/35',
            compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-1.5 py-0.5 text-[9.5px]'
          )}
          title="Translation or selected options incomplete"
        >
          <AlertTriangle size={10} className="shrink-0 text-red-500" />
          <span>Incomplete</span>
        </span>
      )}

      {/* Setting Option Tags: Green when applied, reduced opacity when not applied */}
      {optionTags.map((tag) => (
        <span
          key={tag.id}
          className={cn(
            'inline-flex items-center rounded-md border font-semibold shrink-0 transition-opacity',
            compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-1.5 py-0.5 text-[9.5px]',
            tag.applied
              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
              : 'opacity-35'
          )}
          style={
            tag.applied
              ? undefined
              : {
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                }
          }
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
};

export const HomeTabView: React.FC<HomeTabViewProps> = ({
  fileName,
  syncedBaseTitle,
  detectedFormat,
  subtitlesCount,
  translatedCount,
  googleCount,
  activeDraftId,
  drafts,
  mySubtitlesFiles = [],
  crashSnapshot,
  onRecoverCrash,
  onDismissCrash,
  onUploadFile,
  onLoadFromUrl,
  onLoadDemo,
  onSaveCurrentAsDraft,
  onLoadDraft,
  onLoadDraftVersion,
  onRestoreDraft,
  onDuplicateDraft,
  onRenameDraft,
  onMoveDraft,
  onDeleteDraft,
  onOpenMySubtitleFile,
  onRenameMySubtitleFile,
  onMoveMySubtitleFile,
  onDeleteMySubtitleFile,
  onOpenMySubtitlesDrawer,
  onOpenWorkspace,
  onDiscardProject,
  onOpenAiCinema,
  isHeavyTranslationActive = false,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction>(null);
  const [translatedTagFilter, setTranslatedTagFilter] = useState<string>('All');
  const [mySubTagFilter, setMySubTagFilter] = useState<string>('All');
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [openVersionMenuKey, setOpenVersionMenuKey] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<RenameModalState>(null);
  const [moveModal, setMoveModal] = useState<MoveModalState>(null);
  const [isMutating, setIsMutating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingConfirm && !openMenuKey && !openVersionMenuKey && !renameModal && !moveModal) return;
    return registerBackHandler(() => {
      if (pendingConfirm) {
        setPendingConfirm(null);
        return true;
      }
      if (renameModal) {
        setRenameModal(null);
        return true;
      }
      if (moveModal) {
        setMoveModal(null);
        return true;
      }
      if (openVersionMenuKey) {
        setOpenVersionMenuKey(null);
        return true;
      }
      if (openMenuKey) {
        setOpenMenuKey(null);
        return true;
      }
      return false;
    });
  }, [pendingConfirm, openMenuKey, openVersionMenuKey, renameModal, moveModal]);

  useEffect(() => {
    if (!openMenuKey) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-row-menu-root="true"]')) return;
      setOpenMenuKey(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuKey(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuKey]);

  useEffect(() => {
    if (!openVersionMenuKey) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-version-menu-root="true"]')) return;
      setOpenVersionMenuKey(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenVersionMenuKey(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openVersionMenuKey]);

  const hasAnySubtitlesInApp = subtitlesCount > 0 || drafts.length > 0 || mySubtitlesFiles.length > 0;
  const nativeAndroid = isNativeAndroid();

  const activeDisplayTitle = useMemo(() => {
    if (syncedBaseTitle && syncedBaseTitle.trim()) return syncedBaseTitle.trim();
    if (!fileName) return 'Untitled Project';
    return refineSubtitleName(fileName).refinedTitle;
  }, [syncedBaseTitle, fileName]);

  const handleOpenLocalPicker = async () => {
    if (nativeAndroid) {
      try {
        const snap = await getAndroidPermissionSnapshot();
        if (snap.publicStorage === 'prompt' || snap.publicStorage === 'prompt-with-rationale') {
          await requestAndroidStoragePermission();
        }
      } catch {
        // Proceed to system Storage Access Framework document picker
      }
    }
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
      const title =
        draftTitle.trim() ||
        activeDisplayTitle ||
        `Draft ${new Date().toLocaleDateString()}`;
      await onSaveCurrentAsDraft(title);
      setDraftTitle('');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Evaluate all drafts once with tags, refined titles, strict completion & placement
  const evaluatedDrafts = useMemo(() => {
    return drafts.map((draft) => {
      const info: EvaluatedProjectInfo = evaluateProjectTagsAndCompletion(draft);
      const placement = getDraftPlacements(draft, info);
      return { draft, info, placement };
    });
  }, [drafts]);

  // 1. Translated Subtitles List (strictly excludes untranslated app-edited projects)
  const translatedEntries = useMemo(
    () => evaluatedDrafts.filter((e) => e.placement.inTranslated),
    [evaluatedDrafts]
  );

  const availableTranslatedTags = useMemo(() => {
    const order = ['Completed', 'Incomplete', 'AI', 'Neutral', 'Bilingual', 'Urdu', 'Roman', 'Styled'];
    const present = new Set<string>();
    translatedEntries.forEach((entry) => entry.info.filterTags.forEach((t) => present.add(t)));
    const sorted = [
      ...order.filter((t) => present.has(t)),
      ...Array.from(present).filter((t) => !order.includes(t)),
    ];
    return ['All', ...sorted];
  }, [translatedEntries]);

  const filteredTranslatedEntries = useMemo(() => {
    if (translatedTagFilter === 'All') return translatedEntries;
    return translatedEntries.filter((entry) => entry.info.filterTags.includes(translatedTagFilter));
  }, [translatedEntries, translatedTagFilter]);

  // 2. Saved Drafts List
  const savedDraftEntries = useMemo(() => {
    const base = evaluatedDrafts.filter((e) => e.placement.inDrafts);
    if (!draftSearch.trim()) return base;
    const q = draftSearch.toLowerCase();
    return base.filter(
      (e) =>
        e.info.displayTitle.toLowerCase().includes(q) ||
        e.draft.title.toLowerCase().includes(q) ||
        e.draft.fileName.toLowerCase().includes(q) ||
        e.info.filterTags.some((t) => t.toLowerCase().includes(q))
    );
  }, [evaluatedDrafts, draftSearch]);

  // 3. My Subtitles List (Exported files + App-edited untranslated subtitles + linked local folder files)
  type MySubtitleEntry =
    | {
        kind: 'stored-file';
        id: string;
        displayTitle: string;
        tags: string[];
        updatedTs: number;
        subtitleText: string;
        file: StoredSubtitleFile;
      }
    | {
        kind: 'edited-draft';
        id: string;
        displayTitle: string;
        tags: string[];
        updatedTs: number;
        draft: ProjectDraft;
        info: EvaluatedProjectInfo;
      };

  const mySubtitlesEntries = useMemo<MySubtitleEntry[]>(() => {
    const fromFiles: MySubtitleEntry[] = mySubtitlesFiles.map((file) => ({
      kind: 'stored-file',
      id: `file:${file.id}`,
      displayTitle: getDisplayStoredFileTitle(file),
      tags: deriveStoredFileTags(file),
      updatedTs: file.lastModified || new Date(file.addedAt || 0).getTime() || 0,
      subtitleText: `${file.format || 'SRT'} · ${
        file.subFolder ? file.subFolder : file.folderName || 'My Subtitles'
      }`,
      file,
    }));

    const fromEditedDrafts: MySubtitleEntry[] = evaluatedDrafts
      .filter((e) => e.placement.inMySubtitles)
      .map((e) => ({
        kind: 'edited-draft',
        id: `draft:${e.draft.id}`,
        displayTitle: e.info.displayTitle,
        tags: Array.from(new Set(['Edited', ...e.info.filterTags])),
        updatedTs: new Date(e.draft.updatedAt).getTime() || 0,
        draft: e.draft,
        info: e.info,
      }));

    return [...fromEditedDrafts, ...fromFiles].sort((a, b) => b.updatedTs - a.updatedTs);
  }, [mySubtitlesFiles, evaluatedDrafts]);

  const availableMySubTags = useMemo(() => {
    const present = new Set<string>();
    mySubtitlesEntries.forEach((item) => item.tags.forEach((t) => present.add(t)));
    const priority = ['Exported', 'Edited', 'Styled', 'Completed', 'Incomplete', 'Local'];
    const sorted = [
      ...priority.filter((t) => present.has(t)),
      ...Array.from(present).filter((t) => !priority.includes(t)),
    ];
    return ['All', ...sorted];
  }, [mySubtitlesEntries]);

  const filteredMySubEntries = useMemo(() => {
    if (mySubTagFilter === 'All') return mySubtitlesEntries;
    return mySubtitlesEntries.filter((item) => item.tags.includes(mySubTagFilter));
  }, [mySubtitlesEntries, mySubTagFilter]);

  const formatTimeAgo = (isoOrMs: string | number) => {
    try {
      const ts = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
      if (!ts || Number.isNaN(ts)) return '';
      const diffMs = Date.now() - ts;
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(ts).toLocaleDateString();
    } catch {
      return '';
    }
  };

  const executePendingConfirm = async () => {
    if (!pendingConfirm) return;
    const action = pendingConfirm;
    setPendingConfirm(null);
    if (action.type === 'delete-draft') {
      await onDeleteDraft(action.draftId);
    } else if (action.type === 'delete-my-file') {
      await onDeleteMySubtitleFile?.(action.fileId);
    } else if (action.type === 'discard-active') {
      onDiscardProject();
    } else if (action.type === 'dismiss-crash') {
      onDismissCrash();
    }
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModal || isMutating) return;
    const clean = renameModal.value.trim();
    if (!clean) return;
    setIsMutating(true);
    try {
      if (renameModal.kind === 'draft') {
        await onRenameDraft?.(renameModal.draft, clean);
      } else {
        await onRenameMySubtitleFile?.(renameModal.file, clean);
      }
      setRenameModal(null);
    } finally {
      setIsMutating(false);
    }
  };

  const renderRowMenu = (target: MenuTarget) => {
    const key =
      target.kind === 'draft' ? `${target.list}:${target.draft.id}` : `my-file:${target.file.id}`;
    const isOpen = openMenuKey === key;

    return (
      <div className="relative shrink-0" data-row-menu-root="true">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuKey((cur) => (cur === key ? null : key));
          }}
          className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer opacity-80 hover:opacity-100 touch-tactile"
          style={{
            backgroundColor: isOpen ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
            borderColor: isOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
          }}
          title="Actions menu"
          aria-label={`Actions for ${target.displayTitle}`}
          aria-expanded={isOpen}
        >
          <MoreVertical size={14} />
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-10 z-50 w-44 rounded-xl border shadow-xl py-1 overflow-hidden mc-dropdown anim-dropdown-in"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
          >
            {/* Edit / Open */}
            <button
              type="button"
              onClick={() => {
                setOpenMenuKey(null);
                if (target.kind === 'draft') {
                  onLoadDraft(target.draft);
                } else {
                  onOpenMySubtitleFile?.(target.file);
                }
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <ArrowRight size={13} style={{ color: 'var(--theme-accent)' }} />
              <span>Edit / Open</span>
            </button>

            {/* Restore */}
            <button
              type="button"
              onClick={() => {
                setOpenMenuKey(null);
                if (target.kind === 'draft') {
                  if (onRestoreDraft) {
                    void onRestoreDraft(target.draft);
                  } else {
                    onLoadDraft(target.draft);
                  }
                } else {
                  onOpenMySubtitleFile?.(target.file);
                }
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <RotateCcw size={13} className="text-emerald-500" />
              <span>Restore</span>
            </button>

            {/* Duplicate (Drafts & Translated & Edited Drafts) */}
            {target.kind === 'draft' && (
              <button
                type="button"
                onClick={() => {
                  setOpenMenuKey(null);
                  void onDuplicateDraft(target.draft);
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <Copy size={13} className="opacity-75" />
                <span>Duplicate</span>
              </button>
            )}

            {/* Rename */}
            <button
              type="button"
              onClick={() => {
                setOpenMenuKey(null);
                if (target.kind === 'draft') {
                  setRenameModal({
                    kind: 'draft',
                    draft: target.draft,
                    value: target.displayTitle,
                  });
                } else {
                  setRenameModal({
                    kind: 'stored-file',
                    file: target.file,
                    value: target.displayTitle,
                  });
                }
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <Pencil size={13} className="opacity-75" />
              <span>Rename</span>
            </button>

            {/* Move */}
            <button
              type="button"
              onClick={() => {
                setOpenMenuKey(null);
                if (target.kind === 'draft') {
                  setMoveModal({
                    kind: 'draft',
                    draft: target.draft,
                    currentList: target.list,
                    displayTitle: target.displayTitle,
                  });
                } else {
                  setMoveModal({
                    kind: 'stored-file',
                    file: target.file,
                    displayTitle: target.displayTitle,
                  });
                }
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <FolderInput size={13} className="opacity-75" />
              <span>Move</span>
            </button>

            <div className="my-1 border-t" style={{ borderColor: 'var(--theme-border)' }} />

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                setOpenMenuKey(null);
                if (target.kind === 'draft') {
                  setPendingConfirm({
                    type: 'delete-draft',
                    draftId: target.draft.id,
                    title: target.displayTitle,
                  });
                } else {
                  setPendingConfirm({
                    type: 'delete-my-file',
                    fileId: target.file.id,
                    title: target.displayTitle,
                  });
                }
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-red-500 flex items-center gap-2 hover:bg-red-500/10 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderVersionDropdown = (draft: ProjectDraft, rowKey: string) => {
    const versions = getSortedDraftVersions(draft);
    const latest = versions[0];
    const isOpen = openVersionMenuKey === rowKey;

    return (
      <div className="relative inline-flex items-center shrink-0" data-version-menu-root="true">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuKey(null);
            setOpenVersionMenuKey((cur) => (cur === rowKey ? null : rowKey));
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold cursor-pointer transition-colors touch-tactile"
          style={{
            backgroundColor: isOpen ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
            borderColor: isOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
            color: isOpen ? 'var(--theme-accent-text)' : 'var(--theme-text)',
          }}
          title={`${versions.length} saved version${versions.length === 1 ? '' : 's'} (latest first)`}
          aria-expanded={isOpen}
          aria-label={`Versions for ${draft.title}`}
        >
          <History size={10} className="shrink-0 opacity-75" />
          <span>v{latest?.versionNumber || 1}</span>
          {versions.length > 1 && <span className="opacity-60">({versions.length})</span>}
          <ChevronDown size={10} className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div
            className="absolute left-0 top-7 z-50 w-64 max-w-[82vw] rounded-xl border shadow-xl overflow-hidden mc-dropdown anim-dropdown-in"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-2.5 py-1.5 border-b flex items-center justify-between text-[10px] font-semibold opacity-75"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-elevated)' }}
            >
              <span>Saved Versions (Latest First)</span>
              <span className="font-mono">{versions.length} total</span>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: 'var(--theme-border)' }}>
              {versions.map((ver, idx) => (
                <button
                  key={`${draft.id}-v${ver.versionNumber}-${ver.savedAt}`}
                  type="button"
                  onClick={() => {
                    setOpenVersionMenuKey(null);
                    if (onLoadDraftVersion) {
                      onLoadDraftVersion(draft, ver);
                    } else {
                      onLoadDraft(draft);
                    }
                  }}
                  className="w-full px-2.5 py-2 text-left flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--theme-border)' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold">v{ver.versionNumber}</span>
                      {idx === 0 && (
                        <span
                          className="px-1 py-0.2 rounded text-[9px] font-semibold"
                          style={{
                            backgroundColor: 'var(--theme-accent-soft)',
                            color: 'var(--theme-accent-text)',
                          }}
                        >
                          Latest
                        </span>
                      )}
                      {ver.isCompleted ? (
                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle size={10} className="text-red-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] opacity-65 font-mono truncate">
                      {ver.summary || `${ver.translatedCount}/${ver.subtitleCount} AI`} · {formatTimeAgo(ver.savedAt)}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold shrink-0"
                    style={{ color: 'var(--theme-accent-text)' }}
                  >
                    Load
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 max-w-5xl mx-auto w-full">
      {/* Studio Spotlight Banner */}
      <ResponsiveLazyImage
        src={studioHeroBackdrop}
        alt="Urdu Subtitle Localization Studio"
        aspectRatio="16/9"
        sizes="(max-width: 640px) 100vw, 960px"
        deferDuringHeavyWork={isHeavyTranslationActive}
        overlayScrim
        fallbackIcon={<Clapperboard size={22} className="text-white/90" />}
        fallbackTitle="Urdu Subtitle Studio"
        className="w-full h-32 sm:h-40 rounded-2xl border shadow-sm"
      >
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 flex items-end justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ResponsiveLazyImage
              src={urduStudioEmblem}
              alt="Studio Emblem"
              aspectRatio="1/1"
              sizes="44px"
              deferDuringHeavyWork={isHeavyTranslationActive}
              fallbackIcon={<Languages size={16} className="text-white" />}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-white/25 shrink-0 shadow-md"
            />
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold text-white truncate">
                Urdu Subtitle Studio
              </h2>
              <p className="text-[10.5px] sm:text-[11px] text-white/80 truncate">
                {subtitlesCount > 0
                  ? `${activeDisplayTitle} · ${subtitlesCount} lines ready`
                  : 'Import SRT, ASS, or VTT scripts and localize with cinema precision'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAiCinema}
            className="min-h-[36px] px-3 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md touch-tactile vibrant-gradient-bg border border-white/20"
            title="Open AI Cinema Insights"
          >
            <Clapperboard size={14} className="shrink-0" />
            <span className="truncate">Cinema</span>
          </button>
        </div>
      </ResponsiveLazyImage>

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
                Recovery Ready · {refineSubtitleName(crashSnapshot.fileName || 'Untitled').refinedTitle}
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
                  title: refineSubtitleName(crashSnapshot.fileName || 'Recovery Snapshot').refinedTitle,
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
          className="rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 theme-card mc-card-1"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            padding: 'var(--card-pad)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText size={17} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mc-card-icon" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-semibold truncate mc-card-title" title={fileName}>
                  {activeDisplayTitle}
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
                  title: activeDisplayTitle || 'Active Subtitle Workspace',
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

      {/* Import Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Local File Picker */}
        <div
          className="rounded-xl border space-y-2.5 theme-card mc-card-2 flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            padding: 'var(--card-pad)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mc-card-icon" />
              <h3 className="text-xs sm:text-sm font-semibold truncate mc-card-title">Local File</h3>
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
            accept={
              nativeAndroid
                ? '*/*'
                : '.srt,.vtt,.ass,.ssa,.sbv,.lrc,.json,.txt,text/vtt,text/plain,application/json,application/x-subrip'
            }
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
          className="rounded-xl border space-y-2.5 theme-card mc-card-3 flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--theme-surface)',
            borderColor: 'var(--theme-border)',
            padding: 'var(--card-pad)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Globe size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mc-card-icon" />
              <h3 className="text-xs sm:text-sm font-semibold truncate mc-card-title">URL Import</h3>
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

      {/* 1. Translated Subtitles List — Tags & Progress ABOVE Every File Name */}
      <div
        className="rounded-xl border space-y-2.5 theme-card mc-card-4"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Languages size={15} style={{ color: 'var(--theme-accent)' }} className="mc-card-icon" />
            <h3 className="text-xs sm:text-sm font-semibold mc-card-title">Translated Subtitles</h3>
            <span className="text-[11px] font-mono opacity-55 tabular-nums">· {translatedEntries.length}</span>
            <InfoPopover
              title="Translated Subtitles"
              description="Projects with AI or Neutral translations. Applied settings appear as green tags above the name; unapplied options appear dimmed."
              align="left"
            />
          </div>

          {availableTranslatedTags.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              {availableTranslatedTags.map((tag) => {
                const active = translatedTagFilter === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTranslatedTagFilter(tag)}
                    className={cn(
                      'px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors',
                      active ? 'text-white' : 'opacity-75 hover:opacity-100'
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

        {filteredTranslatedEntries.length === 0 ? (
          <div className="py-4 text-center text-[11px] opacity-60 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {translatedEntries.length === 0
              ? 'No translated subtitle projects yet. Untranslated edited files appear under My Subtitles.'
              : `No translated subtitles tagged "${translatedTagFilter}".`}
          </div>
        ) : (
          <div className="divide-y border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {filteredTranslatedEntries.map(({ draft, info }) => {
              const isOpened = activeDraftId === draft.id;
              return (
                <div
                  key={`trans-${draft.id}`}
                  className="py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-2 transition-colors"
                  style={isOpened ? { backgroundColor: 'var(--theme-accent-soft)' } : undefined}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Applied setting tags + Progress tag ABOVE file name */}
                    <ProjectTagsRow isCompleted={info.isCompleted} optionTags={info.optionTags} />

                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onLoadDraft(draft)}
                        className="text-left text-xs font-semibold truncate hover:underline cursor-pointer max-w-full"
                        title={draft.fileName || info.displayTitle}
                      >
                        {info.displayTitle}
                      </button>
                      {renderVersionDropdown(draft, `trans-ver-${draft.id}`)}
                      {isOpened && (
                        <span
                          className="text-[10px] font-semibold shrink-0"
                          style={{ color: 'var(--theme-accent-text)' }}
                        >
                          · Opened
                        </span>
                      )}
                    </div>

                    <p className="text-[10.5px] font-mono tabular-nums opacity-65 truncate">
                      {info.aiCount}/{info.totalCount} AI · {info.gCount}/{info.totalCount} Neutral
                      {info.aiErrorCount + info.gErrorCount > 0
                        ? ` · ${info.aiErrorCount + info.gErrorCount} error(s)`
                        : ''}
                      {` · ${formatTimeAgo(draft.updatedAt)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {renderRowMenu({
                      list: 'translated',
                      kind: 'draft',
                      draft,
                      displayTitle: info.displayTitle,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Saved Drafts List — Tags & Progress BELOW Every File Name */}
      <div
        className="rounded-xl border space-y-2.5 theme-card mc-card-5"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Save size={15} style={{ color: 'var(--theme-accent)' }} className="mc-card-icon" />
            <h3 className="text-xs sm:text-sm font-semibold mc-card-title">Saved Drafts</h3>
            <span className="text-[11px] font-mono opacity-55 tabular-nums">· {savedDraftEntries.length}</span>
            <InfoPopover
              title="Saved Drafts"
              description="Offline snapshots of timelines, translations, and styling with applied setting tags below each title."
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
              placeholder={activeDisplayTitle ? `Save snapshot (${activeDisplayTitle})` : 'Draft title...'}
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

        {savedDraftEntries.length === 0 ? (
          <div className="py-5 text-center text-[11px] opacity-60 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {drafts.length === 0 ? 'No saved drafts yet.' : 'No matching drafts.'}
          </div>
        ) : (
          <div className="divide-y border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {savedDraftEntries.map(({ draft, info }) => {
              const isOpened = activeDraftId === draft.id;
              return (
                <div
                  key={draft.id}
                  className={cn(
                    'py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-2 transition-colors',
                    isOpened && 'ring-1 ring-[var(--theme-accent)]'
                  )}
                  style={{
                    borderColor: 'var(--theme-border)',
                    backgroundColor: isOpened ? 'var(--theme-accent-soft)' : undefined,
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onLoadDraft(draft)}
                        className="text-left text-xs font-semibold truncate hover:underline cursor-pointer max-w-full"
                        title={draft.fileName || info.displayTitle}
                      >
                        {info.displayTitle}
                      </button>
                      {renderVersionDropdown(draft, `draft-ver-${draft.id}`)}
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
                      {draft.sourceType.toUpperCase()} · {info.aiCount}/{info.totalCount} AI · {info.gCount}/{info.totalCount} Neutral · {formatTimeAgo(draft.updatedAt)}
                    </p>

                    {/* Applied setting tags + Progress tag BELOW file name */}
                    <ProjectTagsRow isCompleted={info.isCompleted} optionTags={info.optionTags} compact />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {renderRowMenu({
                      list: 'drafts',
                      kind: 'draft',
                      draft,
                      displayTitle: info.displayTitle,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. My Subtitles List (Exported Subtitles + Untranslated App-Edited Projects + Linked Folder) */}
      <div
        className="rounded-xl border space-y-2.5 theme-card mc-card-1"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen size={15} style={{ color: 'var(--theme-accent)' }} className="mc-card-icon" />
            <h3 className="text-xs sm:text-sm font-semibold mc-card-title">My Subtitles</h3>
            <span className="text-[11px] font-mono opacity-55 tabular-nums">· {mySubtitlesEntries.length}</span>
            <InfoPopover
              title="My Subtitles"
              description="Automatically lists exported subtitle files, untranslated subtitles edited in this app, and files from your My Subtitles folder."
              align="left"
            />
          </div>

          {onOpenMySubtitlesDrawer && (
            <button
              type="button"
              onClick={onOpenMySubtitlesDrawer}
              className="min-h-[30px] px-2.5 rounded-lg border text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <FolderOpen size={12} style={{ color: 'var(--theme-accent)' }} />
              <span>Manage Folder</span>
            </button>
          )}
        </div>

        {availableMySubTags.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            {availableMySubTags.map((tag) => {
              const active = mySubTagFilter === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setMySubTagFilter(tag)}
                  className={cn(
                    'px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors',
                    active ? 'text-white' : 'opacity-75 hover:opacity-100'
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

        {filteredMySubEntries.length === 0 ? (
          <div className="py-4 text-center text-[11px] opacity-60 border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {mySubtitlesEntries.length === 0
              ? 'Exported subtitles and app-edited (untranslated) files appear here automatically.'
              : `No items in My Subtitles tagged "${mySubTagFilter}".`}
          </div>
        ) : (
          <div className="divide-y border-t" style={{ borderColor: 'var(--theme-border)' }}>
            {filteredMySubEntries.map((entry) => {
              if (entry.kind === 'edited-draft') {
                const isOpened = activeDraftId === entry.draft.id;
                return (
                  <div
                    key={entry.id}
                    className="py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-2 transition-colors"
                    style={isOpened ? { backgroundColor: 'var(--theme-accent-soft)' } : undefined}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onLoadDraft(entry.draft)}
                          className="text-left text-xs font-semibold truncate hover:underline cursor-pointer max-w-full"
                        >
                          {entry.displayTitle}
                        </button>
                        {renderVersionDropdown(entry.draft, `my-ver-${entry.draft.id}`)}
                        {isOpened && (
                          <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--theme-accent-text)' }}>
                            · Opened
                          </span>
                        )}
                      </div>

                      <p className="text-[10.5px] opacity-60 font-mono tabular-nums truncate">
                        App Edited · {entry.info.totalCount} lines · {formatTimeAgo(entry.draft.updatedAt)}
                      </p>

                      <div className="flex items-center gap-1 flex-wrap">
                        {entry.info.isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold bg-emerald-500/15 text-emerald-500 border-emerald-500/35">
                            <CheckCircle2 size={10} />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold bg-red-500/15 text-red-500 border-red-500/35">
                            <AlertTriangle size={10} />
                            <span>Incomplete</span>
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded-md border text-[9px] font-semibold bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                          Edited
                        </span>
                        {entry.info.hasStyledLines && (
                          <span className="px-1.5 py-0.5 rounded-md border text-[9px] font-semibold bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                            Styled
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded-md border text-[9px] font-semibold bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                          {entry.info.formatLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {renderRowMenu({
                        list: 'my-subtitles',
                        kind: 'draft',
                        draft: entry.draft,
                        displayTitle: entry.displayTitle,
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={entry.id}
                  className="py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => onOpenMySubtitleFile?.(entry.file)}
                      className="text-left text-xs font-semibold truncate hover:underline cursor-pointer block max-w-full"
                      title={entry.file.name}
                    >
                      {entry.displayTitle}
                    </button>

                    <p className="text-[10.5px] opacity-60 font-mono tabular-nums truncate">
                      {entry.subtitleText}
                      {entry.updatedTs ? ` · ${formatTimeAgo(entry.updatedTs)}` : ''}
                    </p>

                    <div className="flex items-center gap-1 flex-wrap">
                      {entry.tags.map((tag) => {
                        const isGreen =
                          tag === 'Completed' || tag === 'Exported' || tag === 'Edited' || tag === 'Styled';
                        const isRed = tag === 'Incomplete';
                        return (
                          <span
                            key={tag}
                            className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold',
                              isGreen
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : isRed
                                ? 'bg-red-500/15 text-red-500 border-red-500/35'
                                : 'opacity-80'
                            )}
                            style={
                              !isGreen && !isRed
                                ? { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                                : undefined
                            }
                          >
                            {tag === 'Completed' && <CheckCircle2 size={9} />}
                            {tag === 'Incomplete' && <AlertTriangle size={9} />}
                            <span>{tag}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {renderRowMenu({
                      list: 'my-subtitles',
                      kind: 'stored-file',
                      file: entry.file,
                      displayTitle: entry.displayTitle,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* More Tools (AI Cinema Studio) */}
      <div
        className="w-full rounded-xl border flex items-center justify-between gap-2 theme-card mc-card-2"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          padding: 'var(--card-pad)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Clapperboard size={16} style={{ color: 'var(--theme-accent)' }} className="shrink-0 mc-card-icon" />
          <span className="text-xs sm:text-sm font-semibold truncate mc-card-title">AI Cinema Studio</span>
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

      {/* Rename Modal */}
      {renameModal && (
        <div
          className="fixed inset-0 z-[160] bg-black/58 flex items-center justify-center p-4"
          onClick={() => setRenameModal(null)}
        >
          <form
            onSubmit={handleConfirmRename}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden mc-popup anim-pop-in"
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
              <div className="flex items-center gap-2">
                <Pencil size={15} style={{ color: 'var(--theme-accent)' }} />
                <h3 className="text-xs sm:text-sm font-semibold mc-popup-title">Rename Subtitle</h3>
              </div>
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                aria-label="Close rename modal"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <input
                type="text"
                autoFocus
                value={renameModal.value}
                onChange={(e) => setRenameModal((prev) => (prev ? { ...prev, value: e.target.value } : null))}
                placeholder="Enter refined title (Name, Year, S01E05, Part)..."
                className="w-full min-h-[40px] px-3 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
              <p className="text-[10.5px] opacity-65">
                Syncs automatically with the Export tab if this project is currently active.
              </p>
            </div>

            <div
              className="px-4 py-3 border-t flex items-center justify-end gap-2 mc-popup-footer"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="min-h-[36px] px-3 rounded-lg border text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameModal.value.trim() || isMutating}
                className="min-h-[36px] px-3.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                <Check size={13} />
                <span>Save Name</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Move Modal */}
      {moveModal && (
        <div
          className="fixed inset-0 z-[160] bg-black/58 flex items-center justify-center p-4"
          onClick={() => setMoveModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden mc-popup anim-pop-in"
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
                <FolderInput size={15} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
                <h3 className="text-xs sm:text-sm font-semibold truncate mc-popup-title">
                  Move "{moveModal.displayTitle}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMoveModal(null)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                aria-label="Close move modal"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {moveModal.kind === 'draft' ? (
                <>
                  <p className="text-[11px] opacity-70 mb-2">Choose destination list on Home:</p>
                  {(
                    [
                      {
                        id: 'translated',
                        label: 'Translated Subtitles',
                        desc: 'Show with translation tags above file name',
                      },
                      {
                        id: 'drafts',
                        label: 'Saved Drafts Only',
                        desc: 'Keep in Saved Drafts with tags below name',
                      },
                      {
                        id: 'my-subtitles',
                        label: 'My Subtitles',
                        desc: 'Move to My Subtitles library',
                      },
                    ] as const
                  ).map((dest) => {
                    const isCurrent = moveModal.currentList === dest.id;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        disabled={isMutating}
                        onClick={async () => {
                          setIsMutating(true);
                          try {
                            await onMoveDraft?.(moveModal.draft, dest.id);
                            setMoveModal(null);
                          } finally {
                            setIsMutating(false);
                          }
                        }}
                        className="w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isCurrent ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                          borderColor: isCurrent ? 'var(--theme-accent)' : 'var(--theme-border)',
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{dest.label}</p>
                          <p className="text-[10px] opacity-65">{dest.desc}</p>
                        </div>
                        {isCurrent && <Check size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />}
                      </button>
                    );
                  })}
                </>
              ) : (
                <>
                  <p className="text-[11px] opacity-70 mb-2">Move file to My Subtitles category:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MY_SUBTITLE_CATEGORIES.map((cat) => {
                      const isCurrent = (moveModal.file.subFolder || moveModal.file.folderName) === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          disabled={isMutating}
                          onClick={async () => {
                            setIsMutating(true);
                            try {
                              await onMoveMySubtitleFile?.(moveModal.file, cat);
                              setMoveModal(null);
                            } finally {
                              setIsMutating(false);
                            }
                          }}
                          className="min-h-[38px] px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1.5 cursor-pointer"
                          style={{
                            backgroundColor: isCurrent ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                            borderColor: isCurrent ? 'var(--theme-accent)' : 'var(--theme-border)',
                          }}
                        >
                          <span className="truncate">{cat}</span>
                          {isCurrent && <Check size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yes / No Confirmation Dialog */}
      <ConfirmDialogModal
        isOpen={pendingConfirm !== null}
        title={
          pendingConfirm?.type === 'delete-draft'
            ? 'Delete Draft?'
            : pendingConfirm?.type === 'delete-my-file'
            ? 'Remove from My Subtitles?'
            : pendingConfirm?.type === 'discard-active'
            ? 'Clear Active Workspace?'
            : 'Dismiss Recovery Snapshot?'
        }
        message={
          pendingConfirm?.type === 'delete-draft'
            ? `Are you sure you want to permanently delete "${pendingConfirm.title}"?`
            : pendingConfirm?.type === 'delete-my-file'
            ? `Remove "${pendingConfirm.title}" from your My Subtitles list?`
            : pendingConfirm?.type === 'discard-active'
            ? `Clear "${pendingConfirm.title}" from the workspace? Your active progress will be auto-saved.`
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
