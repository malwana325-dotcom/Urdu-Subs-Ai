import { SubtitleItem } from '../utils/srtParser';

export interface AppState {
  subtitles: any[];
  context: string;
  customPrompt: string;
  logs: any[];
  fileName: string;
  detectedFormat?: string;
  selectedModel: string;
  customApiKey?: string;
  googleApiKey: string;
  geminiBatchSize: number;
  googleBatchSize: number;
  geminiWorkers: number;
  googleWorkers: number;
  geminiDelay: number;
  sessionId?: string;
  translatedFontSize?: number;
  originalFontSize?: number;
  urduFont?: string;
  originalFont?: string;
  translationSettings?: any;
  targetLanguage?: string;
  sourceLanguage?: string;
  scriptMode?: string;
  toneRegister?: string;
  honorificRegister?: string;
  loanWordMode?: string;
  idiomMode?: string;
  lineBreakMode?: string;
  contentFilter?: string;
  audioCueMode?: string;
  numberFormatMode?: string;
  punctuationMode?: string;
  visibleColumns?: any;
  theme?: string;
  activeStylingConfig?: any;
  isWorkspaceStylingPreview?: boolean;
  isReadOnly?: boolean;
  studioColumnsToDisplay?: {
    original: boolean;
    ai: boolean;
    google: boolean;
    time: boolean;
  };
  googleFontSize?: number;
  googleFont?: string;
  isGlobalFontActive?: boolean;
  globalFont?: string;
  globalFontSize?: number;
  fontTarget?: 'global' | 'original' | 'ai' | 'google';
  fontsActiveTab?: 'english' | 'urdu' | 'local';
  pageSize?: number;
  activeDraftId?: string | null;
  hasAppliedCustomStyle?: boolean;
  editedInApp?: boolean;
  syncedBaseTitle?: string;
}

export type ProjectListPlacement = 'auto' | 'translated' | 'drafts' | 'my-subtitles';

export interface ProjectDraftVersion {
  versionNumber: number;
  savedAt: string;
  summary?: string;
  subtitleCount: number;
  translatedCount: number;
  googleCount?: number;
  isCompleted?: boolean;
  editedInApp?: boolean;
  hasAppliedCustomStyle?: boolean;
  subtitles: SubtitleItem[];
  context: string;
  customPrompt: string;
  translationSettings?: any;
  activeStylingConfig?: any;
}

export interface ProjectDraft {
  id: string;
  title: string;
  isRenamedTitle?: boolean;
  fileName: string;
  detectedFormat: string;
  sourceType: 'local' | 'url' | 'demo';
  sourceUrl?: string;
  updatedAt: string;
  subtitleCount: number;
  translatedCount: number;
  googleCount?: number;
  isCompleted?: boolean;
  editedInApp?: boolean;
  hasAppliedCustomStyle?: boolean;
  categoryPlacement?: ProjectListPlacement;
  tags?: string[];
  subtitles: SubtitleItem[];
  context: string;
  customPrompt: string;
  translationSettings?: any;
  activeStylingConfig?: any;
  versions?: ProjectDraftVersion[];
}

export interface CrashSnapshot {
  savedAt: string;
  fileName: string;
  detectedFormat: string;
  subtitles: SubtitleItem[];
  context: string;
  customPrompt: string;
}

export interface StorageStats {
  draftsCount: number;
  subtitlesInActive: number;
  logsCount: number;
  estimatedBytes: number;
  localStorageBytes: number;
}

export interface DetailedStorageBreakdown extends StorageStats {
  activeProjectBytes: number;
  crashSnapshotBytes: number;
  crashSnapshotSavedAt: string | null;
  draftItems: Array<{
    id: string;
    title: string;
    fileName: string;
    subtitleCount: number;
    updatedAt: string;
    bytes: number;
  }>;
  quotaTotalBytes: number | null;
  quotaUsageBytes: number | null;
}

export interface StoredSubtitleFile {
  id: string;
  name: string;
  displayName?: string;
  folderName: string;
  relativePath: string;
  format: string;
  sizeBytes: number;
  lastModified: number;
  content: string;
  addedAt: string;
  sourceKind?: 'folder' | 'exported' | 'edited';
  subFolder?: string;
  tags?: string[];
  isCompleted?: boolean;
  draftId?: string;
  categoryPlacement?: ProjectListPlacement;
}

const DB_NAME = 'UrduLocalizerDB';
const STORE_NAME = 'app_state';
const DRAFTS_STORE = 'project_drafts';
const CRASH_STORE = 'crash_recovery';
const MY_SUBTITLES_FILES_STORE = 'my_subtitles_files';
const FOLDER_HANDLES_STORE = 'folder_handles';
const DB_VERSION = 3;

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
          db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CRASH_STORE)) {
          db.createObjectStore(CRASH_STORE);
        }
        if (!db.objectStoreNames.contains(MY_SUBTITLES_FILES_STORE)) {
          db.createObjectStore(MY_SUBTITLES_FILES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(FOLDER_HANDLES_STORE)) {
          db.createObjectStore(FOLDER_HANDLES_STORE);
        }
      };
    });
  }

  async saveState(state: AppState): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, 'current_state');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async loadState(): Promise<AppState | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current_state');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async clearState(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('current_state');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ---- Project Drafts CRUD ----
  async saveDraft(draft: ProjectDraft): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAFTS_STORE], 'readwrite');
      const store = transaction.objectStore(DRAFTS_STORE);
      const request = store.put(draft);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async listDrafts(): Promise<ProjectDraft[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAFTS_STORE], 'readonly');
      const store = transaction.objectStore(DRAFTS_STORE);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items: ProjectDraft[] = request.result || [];
        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(items);
      };
    });
  }

  async deleteDraft(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAFTS_STORE], 'readwrite');
      const store = transaction.objectStore(DRAFTS_STORE);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllDrafts(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DRAFTS_STORE], 'readwrite');
      const store = transaction.objectStore(DRAFTS_STORE);
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ---- Crash-Safe Live Recovery Snapshots ----
  async saveCrashSnapshot(snapshot: CrashSnapshot): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CRASH_STORE], 'readwrite');
      const store = transaction.objectStore(CRASH_STORE);
      const request = store.put(snapshot, 'live_recovery');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async loadCrashSnapshot(): Promise<CrashSnapshot | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CRASH_STORE], 'readonly');
      const store = transaction.objectStore(CRASH_STORE);
      const request = store.get('live_recovery');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async clearCrashSnapshot(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CRASH_STORE], 'readwrite');
      const store = transaction.objectStore(CRASH_STORE);
      const request = store.delete('live_recovery');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getStorageStats(): Promise<StorageStats> {
    const [activeState, drafts] = await Promise.all([
      this.loadState().catch(() => null),
      this.listDrafts().catch(() => []),
    ]);
    let estimatedBytes = 0;
    try {
      if (activeState) estimatedBytes += new Blob([JSON.stringify(activeState)]).size;
      if (drafts.length > 0) estimatedBytes += new Blob([JSON.stringify(drafts)]).size;
    } catch {
      // ignore size calculation errors
    }

    let localStorageBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          localStorageBytes += (k.length + (localStorage.getItem(k)?.length || 0)) * 2;
        }
      }
    } catch {
      // ignore
    }

    return {
      draftsCount: drafts.length,
      subtitlesInActive: activeState?.subtitles?.length || 0,
      logsCount: activeState?.logs?.length || 0,
      estimatedBytes: estimatedBytes + localStorageBytes,
      localStorageBytes,
    };
  }

  async getDetailedStorageBreakdown(): Promise<DetailedStorageBreakdown> {
    const [activeState, drafts, crashSnapshot] = await Promise.all([
      this.loadState().catch(() => null),
      this.listDrafts().catch(() => []),
      this.loadCrashSnapshot().catch(() => null),
    ]);

    const measure = (val: unknown): number => {
      if (!val) return 0;
      try {
        return new Blob([JSON.stringify(val)]).size;
      } catch {
        return 0;
      }
    };

    const activeProjectBytes = measure(activeState);
    const crashSnapshotBytes = measure(crashSnapshot);
    const draftItems = drafts.map((d) => ({
      id: d.id,
      title: d.title || d.fileName,
      fileName: d.fileName,
      subtitleCount: d.subtitleCount || d.subtitles?.length || 0,
      updatedAt: d.updatedAt,
      bytes: measure(d),
    }));
    const totalDraftsBytes = draftItems.reduce((sum, item) => sum + item.bytes, 0);

    let localStorageBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          localStorageBytes += (k.length + (localStorage.getItem(k)?.length || 0)) * 2;
        }
      }
    } catch {
      // ignore
    }

    let quotaTotalBytes: number | null = null;
    let quotaUsageBytes: number | null = null;
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        quotaTotalBytes = est.quota ?? null;
        quotaUsageBytes = est.usage ?? null;
      }
    } catch {
      // ignore navigator.storage estimate errors
    }

    return {
      draftsCount: drafts.length,
      subtitlesInActive: activeState?.subtitles?.length || 0,
      logsCount: activeState?.logs?.length || 0,
      estimatedBytes: activeProjectBytes + totalDraftsBytes + crashSnapshotBytes + localStorageBytes,
      localStorageBytes,
      activeProjectBytes,
      crashSnapshotBytes,
      crashSnapshotSavedAt: crashSnapshot?.savedAt || null,
      draftItems,
      quotaTotalBytes,
      quotaUsageBytes,
    };
  }

  async clearLogsOnly(): Promise<void> {
    const state = await this.loadState().catch(() => null);
    if (state) {
      await this.saveState({ ...state, logs: [] });
    }
  }

  // ---- My Subtitles Folder Files & Directory Handle ----
  async saveMySubtitlesFiles(files: StoredSubtitleFile[]): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MY_SUBTITLES_FILES_STORE], 'readwrite');
      const store = transaction.objectStore(MY_SUBTITLES_FILES_STORE);
      files.forEach((f) => store.put(f));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async replaceMySubtitlesFiles(files: StoredSubtitleFile[]): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MY_SUBTITLES_FILES_STORE], 'readwrite');
      const store = transaction.objectStore(MY_SUBTITLES_FILES_STORE);
      store.clear();
      files.forEach((f) => store.put(f));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async listMySubtitlesFiles(): Promise<StoredSubtitleFile[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MY_SUBTITLES_FILES_STORE], 'readonly');
      const store = transaction.objectStore(MY_SUBTITLES_FILES_STORE);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items: StoredSubtitleFile[] = request.result || [];
        items.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
        resolve(items);
      };
    });
  }

  async deleteMySubtitleFile(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MY_SUBTITLES_FILES_STORE], 'readwrite');
      const store = transaction.objectStore(MY_SUBTITLES_FILES_STORE);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveDirectoryHandle(key: string, handle: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDER_HANDLES_STORE], 'readwrite');
      const store = transaction.objectStore(FOLDER_HANDLES_STORE);
      const request = store.put(handle, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async loadDirectoryHandle(key: string): Promise<any | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDER_HANDLES_STORE], 'readonly');
      const store = transaction.objectStore(FOLDER_HANDLES_STORE);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }
}

export const dbService = new IndexedDBService();
