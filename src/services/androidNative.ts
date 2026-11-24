import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';

export type AndroidPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'scoped' | 'web';
export type AndroidSaveMode = 'documents' | 'documents-and-share' | 'share';

export interface AndroidExportFolder {
  uri: string;
  name: string;
}

export interface AndroidPermissionSnapshot {
  isNativeAndroid: boolean;
  platform: string;
  sdkInt: number | null;
  appVersion: string;
  publicStorage: AndroidPermissionState;
  hasLegacyPermission: boolean;
  needsRuntimePrompt: boolean;
  exportFolder: AndroidExportFolder | null;
  networkConnected: boolean;
  networkType: string;
  canOpenAppSettings: boolean;
  supportsScopedPicker: boolean;
}

export interface IncomingAndroidFilePayload {
  name: string;
  content: string;
}

export interface NativeAndroidExportResult {
  success: boolean;
  fileName?: string;
  folderName?: string;
  savedPath?: string;
  savedUri?: string;
  shared?: boolean;
  error?: string;
}

interface AndroidHostBridgeApi {
  consumePendingSubtitleIntent?: () => string;
  openAppSettings?: () => void;
  getSdkInt?: () => number;
  getAppVersionName?: () => string;
  hasStoragePermission?: () => boolean;
  needsLegacyRuntimePermission?: () => boolean;
  requestStoragePermissionsNow?: () => void;
  pickExportFolder?: () => void;
  getSelectedExportFolderJson?: () => string;
  clearSelectedExportFolder?: () => void;
  writeFileToSelectedFolder?: (fileName: string, content: string, mimeType: string) => string;
}

declare global {
  interface Window {
    __urduLocalizerHandleBack?: () => boolean;
  }
}

function getHostBridge(): AndroidHostBridgeApi | null {
  if (typeof window === 'undefined') return null;
  return ((window as unknown as { AndroidHostBridge?: AndroidHostBridgeApi }).AndroidHostBridge) || null;
}

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getAndroidBuildInfo(): { sdkInt: number | null; appVersion: string; packageId: string } {
  const bridge = getHostBridge();
  let sdkInt: number | null = null;
  let appVersion = '2.0.0';
  try {
    if (bridge?.getSdkInt) {
      const val = Number(bridge.getSdkInt());
      if (Number.isFinite(val) && val > 0) sdkInt = val;
    }
    if (bridge?.getAppVersionName) {
      const ver = String(bridge.getAppVersionName() || '').trim();
      if (ver) appVersion = ver;
    }
  } catch {
    // Ignore native bridge read errors
  }
  return {
    sdkInt,
    appVersion,
    packageId: 'com.urdudubber.app',
  };
}

export function openAndroidAppSettings(): boolean {
  const bridge = getHostBridge();
  if (bridge?.openAppSettings) {
    try {
      bridge.openAppSettings();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function consumePendingAndroidSubtitleFile(): IncomingAndroidFilePayload | null {
  const bridge = getHostBridge();
  if (!bridge?.consumePendingSubtitleIntent) return null;
  try {
    const raw = bridge.consumePendingSubtitleIntent();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.content === 'string' && parsed.content.trim().length > 0) {
      return {
        name: String(parsed.name || 'imported_subtitle.srt'),
        content: parsed.content,
      };
    }
  } catch {
    // Ignore malformed intent payload
  }
  return null;
}

export function getSelectedAndroidExportFolder(): AndroidExportFolder | null {
  if (!isNativeAndroid()) return null;
  const bridge = getHostBridge();
  if (!bridge?.getSelectedExportFolderJson) return null;
  try {
    const raw = bridge.getSelectedExportFolderJson();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.uri === 'string' && parsed.uri.trim()) {
      return {
        uri: parsed.uri,
        name: String(parsed.name || 'Selected Folder'),
      };
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

export function clearAndroidExportFolder(): void {
  const bridge = getHostBridge();
  try {
    bridge?.clearSelectedExportFolder?.();
  } catch {
    // Ignore errors
  }
}

export function pickAndroidExportFolder(): Promise<AndroidExportFolder | null> {
  if (!isNativeAndroid()) return Promise.resolve(null);
  const bridge = getHostBridge();
  if (!bridge?.pickExportFolder) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (folder: AndroidExportFolder | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('urduLocalizerFolderPicked', onPicked);
      window.removeEventListener('urduLocalizerFolderCanceled', onCanceled);
      clearTimeout(safetyTimer);
      resolve(folder);
    };

    const onPicked = () => finish(getSelectedAndroidExportFolder());
    const onCanceled = () => finish(null);
    const safetyTimer = setTimeout(() => finish(getSelectedAndroidExportFolder()), 120000);

    window.addEventListener('urduLocalizerFolderPicked', onPicked);
    window.addEventListener('urduLocalizerFolderCanceled', onCanceled);

    try {
      bridge.pickExportFolder?.();
    } catch {
      finish(null);
    }
  });
}

export async function getAndroidPermissionSnapshot(): Promise<AndroidPermissionSnapshot> {
  const nativeAndroid = isNativeAndroid();
  const buildInfo = getAndroidBuildInfo();
  const bridge = getHostBridge();
  const supportsScopedPicker =
    typeof window !== 'undefined' && typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';

  let networkConnected = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let networkType = networkConnected ? 'online' : 'none';

  try {
    const netStatus = await Network.getStatus();
    networkConnected = netStatus.connected;
    networkType = netStatus.connectionType || (netStatus.connected ? 'online' : 'none');
  } catch {
    // Fallback to browser navigator.onLine
  }

  if (!nativeAndroid) {
    return {
      isNativeAndroid: false,
      platform: Capacitor.getPlatform(),
      sdkInt: null,
      appVersion: buildInfo.appVersion,
      publicStorage: 'web',
      hasLegacyPermission: true,
      needsRuntimePrompt: false,
      exportFolder: null,
      networkConnected,
      networkType,
      canOpenAppSettings: false,
      supportsScopedPicker,
    };
  }

  const exportFolder = getSelectedAndroidExportFolder();
  let needsRuntimePrompt = false;
  let hasLegacyPermission = true;
  try {
    if (bridge?.needsLegacyRuntimePermission) {
      needsRuntimePrompt = Boolean(bridge.needsLegacyRuntimePermission());
    }
    if (bridge?.hasStoragePermission) {
      hasLegacyPermission = Boolean(bridge.hasStoragePermission());
    }
  } catch {
    // Ignore native bridge error
  }

  let publicStorage: AndroidPermissionState = 'prompt';
  try {
    const status = await Filesystem.checkPermissions();
    const raw = status?.publicStorage || 'prompt';
    if (buildInfo.sdkInt !== null && buildInfo.sdkInt >= 33) {
      publicStorage = exportFolder ? 'granted' : 'scoped';
    } else if (raw === 'granted' || !needsRuntimePrompt) {
      publicStorage = 'granted';
    } else {
      publicStorage = raw as AndroidPermissionState;
    }
  } catch {
    if (buildInfo.sdkInt !== null && buildInfo.sdkInt >= 33) {
      publicStorage = exportFolder ? 'granted' : 'scoped';
    } else {
      publicStorage = needsRuntimePrompt ? 'prompt' : 'granted';
    }
  }

  return {
    isNativeAndroid: true,
    platform: 'android',
    sdkInt: buildInfo.sdkInt,
    appVersion: buildInfo.appVersion,
    publicStorage,
    hasLegacyPermission,
    needsRuntimePrompt,
    exportFolder,
    networkConnected,
    networkType,
    canOpenAppSettings: Boolean(bridge?.openAppSettings),
    supportsScopedPicker,
  };
}

export async function requestAndroidStoragePermission(): Promise<{
  granted: boolean;
  state: AndroidPermissionState;
  message: string;
}> {
  if (!isNativeAndroid()) {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persist();
        return {
          granted: true,
          state: 'web',
          message: persisted
            ? 'Browser persistent storage granted for subtitle drafts.'
            : 'Browser uses standard local/file picker storage.',
        };
      }
    } catch {
      // Ignore browser storage persist error
    }
    return {
      granted: true,
      state: 'web',
      message: 'Web storage & file picker ready.',
    };
  }

  const buildInfo = getAndroidBuildInfo();
  const bridge = getHostBridge();

  // Trigger native Android runtime storage dialog on Android <= 12 (API <= 32)
  if (bridge?.requestStoragePermissionsNow && bridge?.needsLegacyRuntimePermission?.()) {
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.removeEventListener('urduLocalizerPermissionsChanged', finish);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, 30000);
      window.addEventListener('urduLocalizerPermissionsChanged', finish);
      try {
        bridge.requestStoragePermissionsNow?.();
      } catch {
        finish();
      }
    });
  }

  try {
    const res = await Filesystem.requestPermissions().catch(() => ({ publicStorage: 'prompt' }));
    const rawState = (res?.publicStorage || 'prompt') as AndroidPermissionState;
    const stillNeedsLegacy = Boolean(bridge?.needsLegacyRuntimePermission?.());
    const folder = getSelectedAndroidExportFolder();

    if (rawState === 'granted' || (!stillNeedsLegacy && buildInfo.sdkInt !== null && buildInfo.sdkInt < 33)) {
      return {
        granted: true,
        state: 'granted',
        message: 'Android storage permission granted for subtitle import & export.',
      };
    }

    if (buildInfo.sdkInt !== null && buildInfo.sdkInt >= 33) {
      return {
        granted: true,
        state: folder ? 'granted' : 'scoped',
        message: folder
          ? `Export folder ready: "${folder.name}".`
          : 'Android 13+ uses Scoped Storage. Choose an Export Folder (such as Downloads) to save files directly.',
      };
    }

    return {
      granted: false,
      state: rawState,
      message:
        rawState === 'denied'
          ? 'Storage permission was denied. Allow Files permission in Android Settings or select an Export Folder.'
          : 'Storage permission not granted yet.',
    };
  } catch (err: any) {
    if (buildInfo.sdkInt !== null && buildInfo.sdkInt >= 30) {
      return {
        granted: true,
        state: 'scoped',
        message: 'Scoped Storage active — select an Export Folder or use Share export.',
      };
    }
    return {
      granted: false,
      state: 'denied',
      message: err?.message || 'Unable to request Android storage permission.',
    };
  }
}

function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.vtt')) return 'text/vtt';
  if (lower.endsWith('.srt')) return 'application/x-subrip';
  return 'text/plain';
}

export async function shareExportedAndroidSubtitle(fileName: string, content: string): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const safeName = (fileName || 'subtitles.srt').replace(/[\\/:*?"<>|]/g, '_');
  const bomContent = content.startsWith('\ufeff') ? content : `\ufeff${content}`;
  try {
    const cacheWrite = await Filesystem.writeFile({
      path: safeName,
      data: bomContent,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    const shareUri =
      cacheWrite.uri ||
      (await Filesystem.getUri({ path: safeName, directory: Directory.Cache })).uri;

    await Share.share({
      title: safeName,
      text: `Exported subtitle file (${safeName})`,
      url: shareUri,
      dialogTitle: 'Save or Share Subtitle File',
    });
    return true;
  } catch {
    return false;
  }
}

export async function exportSubtitleNativeAndroid(options: {
  fileName: string;
  content: string;
  saveMode: AndroidSaveMode;
}): Promise<NativeAndroidExportResult> {
  const safeName = (options.fileName || 'subtitles.srt').replace(/[\\/:*?"<>|]/g, '_');
  const bomContent = options.content.startsWith('\ufeff') ? options.content : `\ufeff${options.content}`;
  const bridge = getHostBridge();

  let savedRelativePath: string | undefined;
  let savedFolderName: string | undefined;
  let savedUri: string | undefined;
  let shareUri: string | undefined;

  if (options.saveMode === 'documents' || options.saveMode === 'documents-and-share') {
    // 1. Prefer user-chosen Android Export Folder (SAF ACTION_OPEN_DOCUMENT_TREE)
    const selectedFolder = getSelectedAndroidExportFolder();
    if (selectedFolder && bridge?.writeFileToSelectedFolder) {
      try {
        const rawRes = bridge.writeFileToSelectedFolder(safeName, bomContent, guessMimeType(safeName));
        const parsed = JSON.parse(rawRes || '{}');
        if (parsed?.success) {
          savedFolderName = String(parsed.folderName || selectedFolder.name);
          savedRelativePath = `${savedFolderName}/${safeName}`;
          savedUri = parsed.uri;
        }
      } catch {
        // Fall through to Documents fallback
      }
    }

    // 2. Fallback to Documents/UrduLocalizer if no custom SAF folder was picked
    if (!savedRelativePath) {
      const permSnapshot = await getAndroidPermissionSnapshot();
      if (permSnapshot.needsRuntimePrompt) {
        await requestAndroidStoragePermission();
      }

      const targetPath = `UrduLocalizer/${safeName}`;
      try {
        await Filesystem.mkdir({
          path: 'UrduLocalizer',
          directory: Directory.Documents,
          recursive: true,
        }).catch(() => {});

        const writeRes = await Filesystem.writeFile({
          path: targetPath,
          data: bomContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });

        savedFolderName = 'Documents/UrduLocalizer';
        savedRelativePath = `Documents/UrduLocalizer/${safeName}`;
        savedUri = writeRes.uri;
        shareUri = writeRes.uri;
      } catch {
        try {
          const extRes = await Filesystem.writeFile({
            path: targetPath,
            data: bomContent,
            directory: Directory.External,
            encoding: Encoding.UTF8,
            recursive: true,
          });
          savedFolderName = 'Android/data/com.urdudubber.app/files/UrduLocalizer';
          savedRelativePath = `${savedFolderName}/${safeName}`;
          savedUri = extRes.uri;
          shareUri = extRes.uri;
        } catch {
          // Will fall back to Share sheet below
        }
      }
    }
  }

  const shouldShare =
    options.saveMode === 'share' ||
    options.saveMode === 'documents-and-share' ||
    !savedRelativePath;

  if (shouldShare) {
    try {
      if (!shareUri) {
        const cacheWrite = await Filesystem.writeFile({
          path: safeName,
          data: bomContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        shareUri = cacheWrite.uri;
      }
      if (!shareUri) {
        const uriRes = await Filesystem.getUri({
          path: safeName,
          directory: Directory.Cache,
        });
        shareUri = uriRes.uri;
      }

      await Share.share({
        title: safeName,
        text: `Exported subtitle file (${safeName})`,
        url: shareUri,
        dialogTitle: 'Save or Share Subtitle File',
      });

      return {
        success: true,
        fileName: safeName,
        folderName: savedFolderName,
        savedPath: savedRelativePath,
        savedUri,
        shared: true,
      };
    } catch (shareErr: any) {
      const msg = String(shareErr?.message || '');
      if (savedRelativePath) {
        return {
          success: true,
          fileName: safeName,
          folderName: savedFolderName,
          savedPath: savedRelativePath,
          savedUri,
          shared: false,
        };
      }
      return {
        success: false,
        error: msg || 'Could not export subtitle file on Android.',
      };
    }
  }

  if (savedRelativePath) {
    return {
      success: true,
      fileName: safeName,
      folderName: savedFolderName,
      savedPath: savedRelativePath,
      savedUri,
      shared: false,
    };
  }

  return {
    success: false,
    error: 'Failed to write subtitle file to Android storage. Select an Export Folder and try again.',
  };
}

export async function syncAndroidStatusBarTheme(isLightTheme: boolean): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: isLightTheme ? Style.Light : Style.Dark });
    await StatusBar.setBackgroundColor({ color: isLightTheme ? '#f8fafc' : '#090a0d' });
  } catch {
    // Ignore StatusBar errors on unsupported OS versions
  }
}

export function initAndroidNativeShell(handlers: {
  isLightTheme: boolean;
  onKeyboardChange: (visible: boolean) => void;
  onNetworkChange: (connected: boolean) => void;
  onBackButton: () => boolean;
  onIncomingFile: (payload: IncomingAndroidFilePayload) => void;
}): () => void {
  const cleanups: (() => void)[] = [];

  if (isNativeAndroid()) {
    void syncAndroidStatusBarTheme(handlers.isLightTheme);

    // Expose synchronous back bridge for MainActivity OnBackPressedCallback
    window.__urduLocalizerHandleBack = () => handlers.onBackButton();
    cleanups.push(() => {
      delete window.__urduLocalizerHandleBack;
    });

    // Check if launched via Open With / Share intent
    const initialFile = consumePendingAndroidSubtitleFile();
    if (initialFile) {
      setTimeout(() => handlers.onIncomingFile(initialFile), 120);
    }

    const onOpenFileEvent = () => {
      const nextFile = consumePendingAndroidSubtitleFile();
      if (nextFile) {
        handlers.onIncomingFile(nextFile);
      }
    };
    window.addEventListener('urduLocalizerOpenFile', onOpenFileEvent);
    cleanups.push(() => window.removeEventListener('urduLocalizerOpenFile', onOpenFileEvent));

    void Keyboard.addListener('keyboardWillShow', () => handlers.onKeyboardChange(true)).then((h) =>
      cleanups.push(() => { void h.remove(); })
    ).catch(() => {});
    void Keyboard.addListener('keyboardDidShow', () => handlers.onKeyboardChange(true)).then((h) =>
      cleanups.push(() => { void h.remove(); })
    ).catch(() => {});
    void Keyboard.addListener('keyboardWillHide', () => handlers.onKeyboardChange(false)).then((h) =>
      cleanups.push(() => { void h.remove(); })
    ).catch(() => {});
    void Keyboard.addListener('keyboardDidHide', () => handlers.onKeyboardChange(false)).then((h) =>
      cleanups.push(() => { void h.remove(); })
    ).catch(() => {});

    // Fallback Capacitor back listener ONLY if MainActivity native bridge isn't attached
    if (!getHostBridge()) {
      void CapApp.addListener('backButton', () => {
        const handled = handlers.onBackButton();
        if (!handled) {
          void CapApp.minimizeApp().catch(() => {
            void CapApp.exitApp().catch(() => {});
          });
        }
      }).then((h) => cleanups.push(() => { void h.remove(); })).catch(() => {});
    }
  }

  void Network.addListener('networkStatusChange', (status) => {
    handlers.onNetworkChange(Boolean(status.connected));
  }).then((h) => cleanups.push(() => { void h.remove(); })).catch(() => {});

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        // Ignore listener removal errors
      }
    });
  };
}
