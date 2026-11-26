import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useDeferredValue,
} from 'react';
import {
  X,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Save,
  Undo2,
  Redo2,
  FileText,
  MoreVertical,
  Replace,
  Wand2,
  Clock,
  FoldHorizontal,
  Scissors,
  Copy,
  ClipboardPaste,
  CheckSquare,
  Eraser,
} from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import { insertSubtitle, deleteSubtitle } from '../utils/subtitleOperations';
import { stripFormatting } from '../utils/subtitleFormatter';
import { StudioSubtitleRow, StudioStreamField } from './StudioSubtitleRow';
import { ActiveStylingConfig } from './StylingStudioDrawer';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import { useBodyScrollLock } from '../utils/scrollLock';
import { cn } from '../utils/cn';
import { URDU_FONT_OPTIONS, ENGLISH_FONT_OPTIONS } from '../constants/fonts';
import { TranslationSettings } from '../services/translationSettings';
import { getClampedPopoverStyle } from '../utils/popoverPlacement';

export interface SubtitleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  onUpdateSubtitles: (updater: (prev: SubtitleItem[]) => SubtitleItem[]) => void;
  initialFocusIndex?: number;
  initialFocusStream?: StudioStreamField;
  fileName: string;
  detectedFormat?: string;
  urduFont: string;
  originalFont?: string;
  googleFont?: string;
  isGlobalFontActive?: boolean;
  globalFont?: string;
  globalFontSize?: number;
  translatedFontSize: number;
  originalFontSize: number;
  googleFontSize?: number;
  translationSettings?: TranslationSettings;
  onOpenTranslationSettings?: () => void;
  onOpenStylizer?: () => void;
  onTranslateGoogle?: (index: number) => Promise<void> | void;
  onApplyGoogleToAI?: (index: number) => void;
  onRetrySelectedAI?: () => Promise<void>;
  onRetrySelectedGoogle?: () => Promise<void>;
  onRetrySelectedBoth?: () => Promise<void> | void;
  onClearSelectedTranslations?: () => void;
  onOpenFindReplace?: () => void;
  onOpenTimeShift?: () => void;
  onOpenGapTiming?: () => void;
  onOpenTextCleanup?: () => void;
  onCopyAllGoogleToEmptyAI?: () => void;
  isTranslating?: boolean;
  isGoogleTranslatingAll?: boolean;
  activeStylingConfig?: ActiveStylingConfig;
  isStylingPreviewActive?: boolean;
  onOpenStylingStudio?: () => void;
  onAddNotification: (msg: string, type: 'success' | 'error') => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onLoadSampleSubtitles?: () => void;
  hasAnySubtitlesInApp?: boolean;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  editorColumns?: { original: boolean; ai: boolean; google: boolean; time: boolean };
  onUpdateEditorColumns?: React.Dispatch<
    React.SetStateAction<{ original: boolean; ai: boolean; google: boolean; time: boolean }>
  >;
}

interface BlockHistoryEntry {
  stack: Array<{
    text: string;
    translatedText: string;
    googleTranslateText: string;
  }>;
  ptr: number;
}

type BlockHistoryStore = Record<number, BlockHistoryEntry>;

const STUDIO_PAGE_SIZE = 40;
const MAX_BLOCK_HISTORY = 30;

function getHistoryStorageKey(fileName: string): string {
  const safeName = (fileName || 'default').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
  return `urdu_dub_editor_block_history_v1:${safeName}`;
}

function loadPersistedBlockHistory(fileName: string): BlockHistoryStore {
  try {
    const raw = localStorage.getItem(getHistoryStorageKey(fileName));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function savePersistedBlockHistory(fileName: string, store: BlockHistoryStore): void {
  try {
    localStorage.setItem(getHistoryStorageKey(fileName), JSON.stringify(store));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export const SubtitleEditorModal: React.FC<SubtitleEditorModalProps> = ({
  isOpen,
  onClose,
  subtitles: initialProjectSubtitles,
  onUpdateSubtitles,
  initialFocusIndex,
  initialFocusStream,
  fileName,
  urduFont,
  originalFont = ENGLISH_FONT_OPTIONS[0].value,
  googleFont = URDU_FONT_OPTIONS[0].value,
  isGlobalFontActive = false,
  globalFont = URDU_FONT_OPTIONS[0].value,
  globalFontSize = 13,
  translatedFontSize,
  originalFontSize,
  googleFontSize = 13,
  onOpenFindReplace,
  onOpenTimeShift,
  onOpenGapTiming,
  onOpenTextCleanup,
  onAddNotification,
  onAddLog,
  onLoadSampleSubtitles,
  hasAnySubtitlesInApp = false,
  editorColumns,
}) => {
  const [localSubtitles, setLocalSubtitles] = useState<SubtitleItem[]>([]);
  const [originalSnapshot, setOriginalSnapshot] = useState<SubtitleItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [currentPage, setCurrentPage] = useState(1);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsStyle, setToolsStyle] = useState<React.CSSProperties>({});
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Single-stream selector: select and edit one stream at a time
  const [activeStream, setActiveStream] = useState<StudioStreamField>('ai');

  // Individual block editing history + last edited row highlight + active stream input
  const [blockHistory, setBlockHistory] = useState<BlockHistoryStore>({});
  const blockHistoryRef = useRef<BlockHistoryStore>({});
  const [lastEditedIndex, setLastEditedIndex] = useState<number | null>(null);
  const [activeFieldInfo, setActiveFieldInfo] = useState<{
    index: number;
    field: StudioStreamField;
  } | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [vvMetrics, setVvMetrics] = useState<{ height: number; top: number } | null>(null);

  const toolsBtnRef = useRef<HTMLButtonElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const inputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeFieldInfoRef = useRef<{ index: number; field: StudioStreamField } | null>(null);
  activeFieldInfoRef.current = activeFieldInfo;
  const localSubtitlesRef = useRef<SubtitleItem[]>(localSubtitles);
  localSubtitlesRef.current = localSubtitles;
  const hasUnsavedRef = useRef(hasUnsavedChanges);
  hasUnsavedRef.current = hasUnsavedChanges;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const cleanDraft = initialProjectSubtitles.map((s) => ({
      ...s,
      text: stripFormatting(s.text || ''),
      translatedText: s.translatedText ? stripFormatting(s.translatedText) : undefined,
      googleTranslateText: s.googleTranslateText ? stripFormatting(s.googleTranslateText) : undefined,
    }));
    setLocalSubtitles(cleanDraft);
    localSubtitlesRef.current = cleanDraft;
    setOriginalSnapshot(cleanDraft);
    setHasUnsavedChanges(false);
    hasUnsavedRef.current = false;
    setSearchInput('');
    setCurrentPage(1);
    setToolsOpen(false);
    setConfirmState(null);
    setActiveFieldInfo(null);
    activeFieldInfoRef.current = null;

    const defaultStream: StudioStreamField =
      initialFocusStream ||
      (editorColumns?.ai !== false
        ? 'ai'
        : editorColumns?.original !== false
        ? 'orig'
        : 'google');
    setActiveStream(defaultStream);

    const savedHist = loadPersistedBlockHistory(fileName);
    blockHistoryRef.current = savedHist;
    setBlockHistory(savedHist);

    if (initialFocusIndex) {
      setLastEditedIndex(initialFocusIndex);
    }
  }, [isOpen, initialProjectSubtitles, fileName, initialFocusIndex, initialFocusStream, editorColumns]);

  // Keep active row pinned cleanly above the soft keyboard & bottom bar
  const ensureActiveRowVisible = useCallback((targetIndex: number, forceAnchor = false, smooth = false) => {
    const mainEl = mainScrollRef.current;
    const rowEl = rowRefs.current.get(targetIndex);
    if (!mainEl || !rowEl) return;

    const mainRect = mainEl.getBoundingClientRect();
    const rowRect = rowEl.getBoundingClientRect();
    const outOfViewBelow = rowRect.bottom > mainRect.bottom - 10;
    const outOfViewAbove = rowRect.top < mainRect.top + 6;

    if (!forceAnchor && !outOfViewBelow && !outOfViewAbove) {
      return;
    }

    const desiredTopOffset = Math.max(
      8,
      Math.round(Math.min(mainEl.clientHeight * 0.2, Math.max(8, (mainEl.clientHeight - rowRect.height) * 0.24)))
    );
    const delta = rowRect.top - mainRect.top - desiredTopOffset;
    if (Math.abs(delta) > 2) {
      mainEl.scrollTo({
        top: Math.max(0, mainEl.scrollTop + delta),
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Fixed editing viewport sizing above the soft keyboard
  useEffect(() => {
    if (!isOpen) {
      setIsKeyboardOpen(false);
      setVvMetrics(null);
      return;
    }

    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    let anchorTimer: ReturnType<typeof setTimeout> | null = null;
    let baselineHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    const isEditableElement = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName === 'INPUT') {
        const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
        return !['checkbox', 'radio', 'range', 'file', 'color', 'button', 'submit', 'reset'].includes(type);
      }
      return el.isContentEditable;
    };

    const reanchorFocusedRow = () => {
      const focused = activeFieldInfoRef.current;
      if (!focused) return;
      requestAnimationFrame(() => ensureActiveRowVisible(focused.index, false, false));
      if (anchorTimer) clearTimeout(anchorTimer);
      anchorTimer = setTimeout(() => {
        ensureActiveRowVisible(focused.index, false, false);
      }, 140);
    };

    const syncViewportMetrics = () => {
      if (typeof window !== 'undefined' && (window.scrollY !== 0 || window.scrollX !== 0)) {
        window.scrollTo(0, 0);
      }
      const vv = window.visualViewport;
      if (!vv) {
        setVvMetrics(null);
        reanchorFocusedRow();
        return;
      }
      if (vv.height > baselineHeight) baselineHeight = vv.height;
      const vvShrink = baselineHeight - vv.height > 110;
      setIsKeyboardOpen(vvShrink || isEditableElement(document.activeElement));
      setVvMetrics({
        height: Math.max(240, Math.round(vv.height)),
        top: Math.max(0, Math.round(vv.offsetTop)),
      });
      reanchorFocusedRow();
    };

    const onFocusIn = (e: FocusEvent) => {
      if (blurTimer) clearTimeout(blurTimer);
      if (isEditableElement(e.target)) {
        setIsKeyboardOpen(true);
      }
      syncViewportMetrics();
    };

    const onFocusOut = () => {
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        const active = document.activeElement;
        const vv = window.visualViewport;
        const vvShrink = vv ? baselineHeight - vv.height > 110 : false;
        setIsKeyboardOpen(isEditableElement(active) || vvShrink);
        syncViewportMetrics();
      }, 90);
    };

    syncViewportMetrics();
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', syncViewportMetrics);
    window.visualViewport?.addEventListener('scroll', syncViewportMetrics);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      if (anchorTimer) clearTimeout(anchorTimer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', syncViewportMetrics);
      window.visualViewport?.removeEventListener('scroll', syncViewportMetrics);
    };
  }, [isOpen, ensureActiveRowVisible]);

  useEffect(() => {
    if (!toolsOpen) return;
    const updatePos = () => setToolsStyle(getClampedPopoverStyle(toolsBtnRef.current, 196, 300));
    updatePos();
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        toolsMenuRef.current &&
        !toolsMenuRef.current.contains(target) &&
        toolsBtnRef.current &&
        !toolsBtnRef.current.contains(target)
      ) {
        setToolsOpen(false);
      }
    };
    window.addEventListener('resize', updatePos);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      window.removeEventListener('resize', updatePos);
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [toolsOpen]);

  const filteredSubtitles = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return localSubtitles;
    return localSubtitles.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        (s.translatedText && s.translatedText.toLowerCase().includes(q)) ||
        (s.googleTranslateText && s.googleTranslateText.toLowerCase().includes(q))
    );
  }, [localSubtitles, deferredSearch]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredSubtitles.length / STUDIO_PAGE_SIZE)),
    [filteredSubtitles.length]
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedSubtitles = useMemo(() => {
    const start = (currentPage - 1) * STUDIO_PAGE_SIZE;
    return filteredSubtitles.slice(start, start + STUDIO_PAGE_SIZE);
  }, [filteredSubtitles, currentPage]);

  const setRowRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(index, el);
    else rowRefs.current.delete(index);
  }, []);

  const registerInputRef = useCallback(
    (index: number, field: StudioStreamField, el: HTMLTextAreaElement | null) => {
      const key = `${index}:${field}`;
      if (el) inputRefs.current.set(key, el);
      else inputRefs.current.delete(key);
    },
    []
  );

  // Auto-scroll target block into the fixed upper viewport band above the keyboard & bottom bar
  const scrollBlockToFixedSlot = useCallback(
    (targetIndex: number, smooth = true) => {
      ensureActiveRowVisible(targetIndex, true, smooth);
    },
    [ensureActiveRowVisible]
  );

  useEffect(() => {
    if (!isOpen || !initialFocusIndex) return;
    const itemIdx = filteredSubtitles.findIndex((s) => s.index === initialFocusIndex);
    if (itemIdx !== -1) {
      const targetPage = Math.floor(itemIdx / STUDIO_PAGE_SIZE) + 1;
      setCurrentPage(targetPage);
    }
    const timer = setTimeout(() => {
      scrollBlockToFixedSlot(initialFocusIndex, false);
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, initialFocusIndex, filteredSubtitles, scrollBlockToFixedSlot]);

  const recordBlockSnapshot = useCallback(
    (index: number, prevRow: SubtitleItem, nextRow: SubtitleItem) => {
      const prevSnap = {
        text: prevRow.text || '',
        translatedText: prevRow.translatedText || '',
        googleTranslateText: prevRow.googleTranslateText || '',
      };
      const nextSnap = {
        text: nextRow.text || '',
        translatedText: nextRow.translatedText || '',
        googleTranslateText: nextRow.googleTranslateText || '',
      };
      // Strictly skip no-op edits in Undo/Redo history
      if (
        prevSnap.text === nextSnap.text &&
        prevSnap.translatedText === nextSnap.translatedText &&
        prevSnap.googleTranslateText === nextSnap.googleTranslateText
      ) {
        return;
      }

      const currentStore = { ...blockHistoryRef.current };
      const existing = currentStore[index] || { stack: [prevSnap], ptr: 0 };
      const topSnap = existing.stack[existing.ptr];
      if (
        topSnap &&
        topSnap.text === nextSnap.text &&
        topSnap.translatedText === nextSnap.translatedText &&
        topSnap.googleTranslateText === nextSnap.googleTranslateText
      ) {
        return;
      }

      const trimmedStack = existing.stack.slice(0, existing.ptr + 1);
      trimmedStack.push(nextSnap);
      if (trimmedStack.length > MAX_BLOCK_HISTORY) {
        trimmedStack.shift();
      }

      currentStore[index] = {
        stack: trimmedStack,
        ptr: trimmedStack.length - 1,
      };
      blockHistoryRef.current = currentStore;
      setBlockHistory(currentStore);
      savePersistedBlockHistory(fileName, currentStore);
    },
    [fileName]
  );

  const handleMarkDirty = useCallback((index: number) => {
    hasUnsavedRef.current = true;
    setHasUnsavedChanges(true);
    setLastEditedIndex(index);
  }, []);

  const applyFieldEdit = useCallback(
    (index: number, field: StudioStreamField, newText: string): boolean => {
      const prevRow = localSubtitlesRef.current.find((s) => s.index === index);
      if (!prevRow) return false;

      const prevVal =
        field === 'orig'
          ? prevRow.text || ''
          : field === 'ai'
          ? prevRow.translatedText || ''
          : prevRow.googleTranslateText || '';

      // Do not store or dirty if no actual text change occurred
      if (prevVal === newText) {
        return false;
      }

      const nextRow: SubtitleItem =
        field === 'orig'
          ? { ...prevRow, text: newText }
          : field === 'ai'
          ? { ...prevRow, translatedText: newText }
          : { ...prevRow, googleTranslateText: newText };

      recordBlockSnapshot(index, prevRow, nextRow);

      const next = localSubtitlesRef.current.map((s) => (s.index === index ? nextRow : s));
      localSubtitlesRef.current = next;
      setLocalSubtitles(next);
      hasUnsavedRef.current = true;
      setHasUnsavedChanges(true);
      setLastEditedIndex(index);
      return true;
    },
    [recordBlockSnapshot]
  );

  const handleEditOriginal = useCallback(
    (index: number, newText: string) => {
      applyFieldEdit(index, 'orig', newText);
    },
    [applyFieldEdit]
  );

  const handleEditTranslated = useCallback(
    (index: number, newText: string) => {
      applyFieldEdit(index, 'ai', newText);
    },
    [applyFieldEdit]
  );

  const handleEditGoogle = useCallback(
    (index: number, newText: string) => {
      applyFieldEdit(index, 'google', newText);
    },
    [applyFieldEdit]
  );

  const handleBlockUndo = useCallback(
    (index: number) => {
      const entry = blockHistoryRef.current[index];
      if (!entry || entry.ptr <= 0) return;
      const nextPtr = entry.ptr - 1;
      const snap = entry.stack[nextPtr];
      if (!snap) return;

      const updatedStore: BlockHistoryStore = {
        ...blockHistoryRef.current,
        [index]: { ...entry, ptr: nextPtr },
      };
      blockHistoryRef.current = updatedStore;
      setBlockHistory(updatedStore);
      savePersistedBlockHistory(fileName, updatedStore);

      const next = localSubtitlesRef.current.map((s) =>
        s.index === index
          ? {
              ...s,
              text: snap.text,
              translatedText: snap.translatedText || undefined,
              googleTranslateText: snap.googleTranslateText || undefined,
            }
          : s
      );
      localSubtitlesRef.current = next;
      setLocalSubtitles(next);
      hasUnsavedRef.current = true;
      setHasUnsavedChanges(true);
      setLastEditedIndex(index);
    },
    [fileName]
  );

  const handleBlockRedo = useCallback(
    (index: number) => {
      const entry = blockHistoryRef.current[index];
      if (!entry || entry.ptr >= entry.stack.length - 1) return;
      const nextPtr = entry.ptr + 1;
      const snap = entry.stack[nextPtr];
      if (!snap) return;

      const updatedStore: BlockHistoryStore = {
        ...blockHistoryRef.current,
        [index]: { ...entry, ptr: nextPtr },
      };
      blockHistoryRef.current = updatedStore;
      setBlockHistory(updatedStore);
      savePersistedBlockHistory(fileName, updatedStore);

      const next = localSubtitlesRef.current.map((s) =>
        s.index === index
          ? {
              ...s,
              text: snap.text,
              translatedText: snap.translatedText || undefined,
              googleTranslateText: snap.googleTranslateText || undefined,
            }
          : s
      );
      localSubtitlesRef.current = next;
      setLocalSubtitles(next);
      hasUnsavedRef.current = true;
      setHasUnsavedChanges(true);
      setLastEditedIndex(index);
    },
    [fileName]
  );

  // Double-tap Enter: commit if changed, then scroll the next block up into the fixed viewport above keyboard
  const handleDoubleEnterSaveAdvance = useCallback(
    (index: number, field: StudioStreamField, currentValue: string) => {
      const changed = applyFieldEdit(index, field, currentValue);
      if (changed) {
        const latest = localSubtitlesRef.current;
        onUpdateSubtitles(() => latest);
        setOriginalSnapshot(latest);
        hasUnsavedRef.current = false;
        setHasUnsavedChanges(false);
        setLastEditedIndex(index);
      }

      const currentFilteredPos = filteredSubtitles.findIndex((s) => s.index === index);
      if (currentFilteredPos === -1 || currentFilteredPos + 1 >= filteredSubtitles.length) {
        onAddNotification(changed ? 'Saved (last line reached)' : 'Last line reached', 'success');
        return;
      }

      const nextItem = filteredSubtitles[currentFilteredPos + 1];
      const targetPage = Math.floor((currentFilteredPos + 1) / STUDIO_PAGE_SIZE) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }

      setTimeout(() => {
        scrollBlockToFixedSlot(nextItem.index, true);
        const nextTextarea = inputRefs.current.get(`${nextItem.index}:${field}`);
        if (nextTextarea) {
          nextTextarea.focus({ preventScroll: true });
          const len = nextTextarea.value.length;
          nextTextarea.setSelectionRange(len, len);
        }
      }, targetPage !== currentPage ? 80 : 20);
    },
    [applyFieldEdit, currentPage, filteredSubtitles, onAddNotification, onUpdateSubtitles, scrollBlockToFixedSlot]
  );

  const handleFocusField = useCallback(
    (index: number, field: StudioStreamField, el: HTMLTextAreaElement) => {
      activeTextareaRef.current = el;
      const info = { index, field };
      activeFieldInfoRef.current = info;
      setActiveFieldInfo(info);
      requestAnimationFrame(() => ensureActiveRowVisible(index, true, false));
      setTimeout(() => ensureActiveRowVisible(index, false, false), 180);
    },
    [ensureActiveRowVisible]
  );

  const handleRowTextActivity = useCallback(
    (index: number) => {
      if (typeof window !== 'undefined' && (window.scrollY !== 0 || window.scrollX !== 0)) {
        window.scrollTo(0, 0);
      }
      requestAnimationFrame(() => ensureActiveRowVisible(index, false, false));
    },
    [ensureActiveRowVisible]
  );

  const getActiveTextareaTarget = (): {
    el: HTMLTextAreaElement;
    index: number;
    field: StudioStreamField;
  } | null => {
    if (
      activeTextareaRef.current &&
      document.body.contains(activeTextareaRef.current) &&
      activeFieldInfo
    ) {
      return {
        el: activeTextareaRef.current,
        index: activeFieldInfo.index,
        field: activeFieldInfo.field,
      };
    }
    return null;
  };

  const handleToolbarCut = async () => {
    const target = getActiveTextareaTarget();
    if (!target) {
      onAddNotification('Tap a subtitle text box first', 'error');
      return;
    }
    const { el, index, field } = target;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const val = el.value;
    const hasSelection = end > start;
    const textToCopy = hasSelection ? val.slice(start, end) : val;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // Clipboard fallback ignored if denied
    }
    const nextVal = hasSelection ? val.slice(0, start) + val.slice(end) : '';
    applyFieldEdit(index, field, nextVal);
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      const pos = hasSelection ? start : 0;
      el.setSelectionRange(pos, pos);
    });
    onAddNotification('Cut to clipboard', 'success');
  };

  const handleToolbarCopy = async () => {
    const target = getActiveTextareaTarget();
    if (!target) {
      onAddNotification('Tap a subtitle text box first', 'error');
      return;
    }
    const { el } = target;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = end > start ? el.value.slice(start, end) : el.value;
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected);
      onAddNotification('Copied text', 'success');
    } catch {
      onAddNotification('Clipboard permission unavailable', 'error');
    }
  };

  const handleToolbarPaste = async () => {
    const target = getActiveTextareaTarget();
    if (!target) {
      onAddNotification('Tap a subtitle text box first', 'error');
      return;
    }
    const { el, index, field } = target;
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip) return;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const nextVal = el.value.slice(0, start) + clip + el.value.slice(end);
      applyFieldEdit(index, field, nextVal);
      requestAnimationFrame(() => {
        el.focus({ preventScroll: true });
        const caret = start + clip.length;
        el.setSelectionRange(caret, caret);
      });
    } catch {
      onAddNotification('Clipboard paste blocked by browser', 'error');
    }
  };

  const handleToolbarSelectAll = () => {
    const target = getActiveTextareaTarget();
    if (!target) {
      onAddNotification('Tap a subtitle text box first', 'error');
      return;
    }
    target.el.focus({ preventScroll: true });
    target.el.setSelectionRange(0, target.el.value.length);
  };

  const handleToolbarClearField = () => {
    const target = getActiveTextareaTarget();
    if (!target) {
      onAddNotification('Tap a subtitle text box first', 'error');
      return;
    }
    if (!target.el.value) return;
    applyFieldEdit(target.index, target.field, '');
    requestAnimationFrame(() => {
      target.el.focus({ preventScroll: true });
    });
  };

  const requestDeleteRow = useCallback(
    (index: number) => {
      setConfirmState({
        title: `Delete Subtitle #${index}?`,
        message: 'Are you sure you want to delete this subtitle block?',
        onConfirm: () => {
          const next = deleteSubtitle(localSubtitlesRef.current, index);
          localSubtitlesRef.current = next;
          setLocalSubtitles(next);
          hasUnsavedRef.current = true;
          setHasUnsavedChanges(true);
          onAddNotification(`Removed #${index}`, 'success');
        },
      });
    },
    [onAddNotification]
  );

  const handleAddLine = useCallback(() => {
    const updated = insertSubtitle(localSubtitlesRef.current);
    localSubtitlesRef.current = updated;
    setLocalSubtitles(updated);
    setCurrentPage(Math.max(1, Math.ceil(updated.length / STUDIO_PAGE_SIZE)));
    hasUnsavedRef.current = true;
    setHasUnsavedChanges(true);
  }, []);

  const requestRevertUnsaved = useCallback(() => {
    setConfirmState({
      title: 'Revert Unsaved Changes?',
      message: 'All unsaved edits made in Editor Studio will be discarded.',
      onConfirm: () => {
        localSubtitlesRef.current = originalSnapshot;
        setLocalSubtitles(originalSnapshot);
        hasUnsavedRef.current = false;
        setHasUnsavedChanges(false);
        onAddNotification('Reverted edits', 'success');
      },
    });
  }, [originalSnapshot, onAddNotification]);

  const handleSave = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setTimeout(() => {
      const latest = localSubtitlesRef.current;
      onUpdateSubtitles(() => latest);
      setOriginalSnapshot(latest);
      hasUnsavedRef.current = false;
      setHasUnsavedChanges(false);
      onAddNotification('Saved subtitle edits', 'success');
      onAddLog(`Saved ${latest.length} subtitle lines from Editor.`, 'success');
    }, 25);
  }, [onUpdateSubtitles, onAddNotification, onAddLog]);

  const handleDone = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setTimeout(() => {
      if (hasUnsavedRef.current) {
        const latest = localSubtitlesRef.current;
        onUpdateSubtitles(() => latest);
        onAddLog(`Applied ${latest.length} edited lines to workspace.`, 'success');
      }
      onClose();
    }, 25);
  }, [onUpdateSubtitles, onAddLog, onClose]);

  if (!isOpen) return null;

  const effectiveOriginalFont = isGlobalFontActive ? globalFont : originalFont;
  const effectiveOriginalSize = Math.min(18, isGlobalFontActive ? globalFontSize : originalFontSize || 13);
  const effectiveAiFont = isGlobalFontActive ? globalFont : urduFont;
  const effectiveAiSize = Math.min(20, isGlobalFontActive ? globalFontSize : translatedFontSize || 13);
  const effectiveGoogleFont = isGlobalFontActive ? globalFont : googleFont;
  const effectiveGoogleSize = Math.min(18, isGlobalFontActive ? globalFontSize : googleFontSize || 13);

  const showTime = editorColumns ? editorColumns.time !== false : true;

  const targetBlockForUndo = activeFieldInfo?.index ?? lastEditedIndex;
  const targetEntry = targetBlockForUndo ? blockHistory[targetBlockForUndo] : undefined;
  const canToolbarUndo = Boolean(targetEntry && targetEntry.ptr > 0);
  const canToolbarRedo = Boolean(targetEntry && targetEntry.ptr < targetEntry.stack.length - 1);

  return (
    <div
      className="fixed inset-x-0 z-[100] flex flex-col overflow-hidden pt-safe pb-safe"
      style={{
        backgroundColor: 'var(--theme-canvas)',
        color: 'var(--theme-text)',
        top: vvMetrics ? `${vvMetrics.top}px` : 0,
        height: vvMetrics ? `${vvMetrics.height}px` : '100dvh',
      }}
    >
      {/* Slim Header: Block Count, Single-Stream Selector & Close */}
      <header
        className="px-2.5 sm:px-4 h-10 border-b flex items-center justify-between gap-2 shrink-0 mc-header"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono font-semibold tabular-nums opacity-75 shrink-0 mc-header-title">
            {targetBlockForUndo ? `#${targetBlockForUndo}/` : ''}
            {localSubtitles.length}L
          </span>

          {/* Single-Stream Editing Selector */}
          <div
            className="flex items-center p-0.5 rounded-lg border shrink-0"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            role="tablist"
            aria-label="Select active stream to edit"
          >
            {(
              [
                { id: 'orig', label: 'Orig' },
                { id: 'ai', label: 'AI' },
                { id: 'google', label: 'Neutral' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activeStream === s.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setActiveStream(s.id)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors',
                  activeStream === s.id ? 'text-white' : 'opacity-65 hover:opacity-100'
                )}
                style={activeStream === s.id ? { backgroundColor: 'var(--theme-accent)' } : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDone}
          className="min-h-[30px] px-2.5 rounded-md border text-[11px] font-semibold cursor-pointer btn-inch-cap shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          Close
        </button>
      </header>

      {/* Clamped Overflow Tools Menu */}
      {toolsOpen && (
        <>
          <div
            className="fixed inset-0 z-[130] bg-black/20 backdrop-blur-[1px] backdrop-touch-lock"
            onClick={() => setToolsOpen(false)}
            onTouchMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            aria-hidden="true"
          />
          <div
            ref={toolsMenuRef}
            style={{
              ...toolsStyle,
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
            className="fixed z-[135] rounded-xl border shadow-xl p-1.5 space-y-0.5 overflow-y-auto overscroll-contain mc-popup mc-role-edit"
          >
            <button
              type="button"
              onClick={() => {
                handleAddLine();
                setToolsOpen(false);
              }}
              className="w-full min-h-[34px] px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left"
            >
              <Plus size={13} style={{ color: 'var(--theme-accent)' }} />
              <span>Add Line</span>
            </button>
            {onOpenFindReplace && (
              <button
                type="button"
                onClick={() => {
                  setToolsOpen(false);
                  onOpenFindReplace();
                }}
                className="w-full min-h-[34px] px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left"
              >
                <Replace size={13} />
                <span>Find & Replace</span>
              </button>
            )}
            {onOpenTextCleanup && (
              <button
                type="button"
                onClick={() => {
                  setToolsOpen(false);
                  onOpenTextCleanup();
                }}
                className="w-full min-h-[34px] px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left"
              >
                <Wand2 size={13} />
                <span>Cleanup</span>
              </button>
            )}
            {onOpenTimeShift && (
              <button
                type="button"
                onClick={() => {
                  setToolsOpen(false);
                  onOpenTimeShift();
                }}
                className="w-full min-h-[34px] px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left"
              >
                <Clock size={13} />
                <span>Time Shift</span>
              </button>
            )}
            {onOpenGapTiming && (
              <button
                type="button"
                onClick={() => {
                  setToolsOpen(false);
                  onOpenGapTiming();
                }}
                className="w-full min-h-[34px] px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left"
              >
                <FoldHorizontal size={13} />
                <span>Gap Timing</span>
              </button>
            )}
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={() => {
                  setToolsOpen(false);
                  requestRevertUnsaved();
                }}
                className="w-full min-h-[34px] px-2.5 rounded-lg text-[11px] font-medium text-amber-500 flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left"
              >
                <Undo2 size={13} />
                <span>Revert Unsaved</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Fixed Editing Viewport Body above Keyboard & Bottom Tools Bar */}
      <main ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-auto">
        {paginatedSubtitles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-2 opacity-60">
            <FileText size={24} />
            <p className="text-xs font-medium">
              {localSubtitles.length === 0 ? 'No subtitle lines loaded' : 'No matching lines'}
            </p>
            {localSubtitles.length === 0 && !hasAnySubtitlesInApp && onLoadSampleSubtitles && (
              <button
                type="button"
                onClick={onLoadSampleSubtitles}
                className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold cursor-pointer btn-inch-cap"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                Load Sample
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto pb-[55dvh]">
            {paginatedSubtitles.map((item) => {
              const entry = blockHistory[item.index];
              const canUndo = Boolean(entry && entry.ptr > 0);
              const canRedo = Boolean(entry && entry.ptr < entry.stack.length - 1);

              return (
                <StudioSubtitleRow
                  key={item.index}
                  item={item}
                  showTime={showTime}
                  activeStream={activeStream}
                  effectiveOriginalFont={effectiveOriginalFont}
                  effectiveOriginalSize={effectiveOriginalSize}
                  effectiveAiFont={effectiveAiFont}
                  effectiveAiSize={effectiveAiSize}
                  effectiveGoogleFont={effectiveGoogleFont}
                  effectiveGoogleSize={effectiveGoogleSize}
                  isLastEdited={lastEditedIndex === item.index}
                  canUndoBlock={canUndo}
                  canRedoBlock={canRedo}
                  onUndoBlock={handleBlockUndo}
                  onRedoBlock={handleBlockRedo}
                  onEditOriginal={handleEditOriginal}
                  onEditTranslated={handleEditTranslated}
                  onEditGoogle={handleEditGoogle}
                  onDeleteRow={requestDeleteRow}
                  onMarkDirty={handleMarkDirty}
                  onTextActivity={handleRowTextActivity}
                  onFocusField={handleFocusField}
                  onDoubleEnterSaveAdvance={handleDoubleEnterSaveAdvance}
                  registerInputRef={registerInputRef}
                  setRowRef={setRowRef}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Bar (Docked Above Soft Keyboard): Text Actions + Undo/Redo + Find + Tools + Pagination + Save */}
      <footer
        className="border-t shrink-0 mc-footer"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
      >
        {/* Text Editing Action Strip */}
        <div
          className="px-2 sm:px-3 py-1 border-b flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleToolbarCut}
              className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Cut selection or field"
            >
              <Scissors size={11} />
              <span>Cut</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleToolbarCopy}
              className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Copy selection or field"
            >
              <Copy size={11} />
              <span>Copy</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleToolbarPaste}
              className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Paste at cursor"
            >
              <ClipboardPaste size={11} />
              <span>Paste</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleToolbarSelectAll}
              className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Select all text in active box"
            >
              <CheckSquare size={11} />
              <span>Select</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleToolbarClearField}
              className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer touch-tactile"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Clear active box"
            >
              <Eraser size={11} />
              <span className="hidden xs:inline">Clear</span>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => targetBlockForUndo && handleBlockUndo(targetBlockForUndo)}
              disabled={!canToolbarUndo}
              className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-30 touch-tactile"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Undo block edit"
            >
              <Undo2 size={11} className="text-amber-500" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => targetBlockForUndo && handleBlockRedo(targetBlockForUndo)}
              disabled={!canToolbarRedo}
              className="min-h-[28px] px-2 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-30 touch-tactile"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              title="Redo block edit"
            >
              <Redo2 size={11} className="text-emerald-500" />
              <span>Redo</span>
            </button>
          </div>
        </div>

        {/* Bottom Tools, Search, Pagination & Save Strip */}
        <div className="px-2 sm:px-3 py-1.5 flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="relative min-w-0 flex-1 max-w-[160px]">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Find..."
                className="w-full pl-6 pr-5 py-1 text-[11px] rounded-md border focus:outline-none"
                style={{
                  backgroundColor: 'var(--theme-elevated)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 cursor-pointer"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {filteredSubtitles.length > STUDIO_PAGE_SIZE && !isKeyboardOpen && (
              <div className="flex items-center gap-1 text-[10px] shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="min-h-[28px] px-1.5 rounded border disabled:opacity-35 cursor-pointer flex items-center"
                  style={{ borderColor: 'var(--theme-border)' }}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="font-mono font-semibold px-1 tabular-nums">
                  {currentPage}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="min-h-[28px] px-1.5 rounded border disabled:opacity-35 cursor-pointer flex items-center"
                  style={{ borderColor: 'var(--theme-border)' }}
                  aria-label="Next page"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              ref={toolsBtnRef}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setToolsOpen((o) => !o)}
              className="min-h-[30px] px-2.5 rounded-md border text-[11px] font-semibold flex items-center gap-1 cursor-pointer btn-inch-cap"
              style={{
                backgroundColor: toolsOpen ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                borderColor: toolsOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
              }}
              title="Editor Tools"
            >
              <MoreVertical size={13} />
              <span>Tools</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={cn(
                'min-h-[30px] px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors btn-inch-cap',
                hasUnsavedChanges ? 'text-white' : 'opacity-40 cursor-default border'
              )}
              style={
                hasUnsavedChanges
                  ? { backgroundColor: 'var(--theme-accent)' }
                  : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
              }
            >
              <Save size={12} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </footer>

      <ConfirmDialogModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel="Yes"
        cancelLabel="No"
        danger
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          confirmState?.onConfirm();
          setConfirmState(null);
        }}
      />
    </div>
  );
};
