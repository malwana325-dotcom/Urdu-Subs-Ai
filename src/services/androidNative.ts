import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';

export type AndroidPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'scoped' | 'web';
export type AndroidSaveMode = 'documents' | 'documents-and-share' | 'share';

export interface AndroidPermissionSnapshot {
  isNativeAndroid: boolean;
  platform: string;
  sdkInt: number | null;
  appVersion: string;
  publicStorage: AndroidPermissionState;
  networkConnected: boolean;
  networkType: string;
  canOpenAppSettings: boolean;
  supportsScopedPicker: boolean;
}

export interface IncomingAndroidFilePayload {
  name: string;
  content: string;
}

interface AndroidHostBridgeApi {
  consumePendingSubtitleIntent?: () => string;
  openAppSettings?: () => void;
  getSdkInt?: () => number;
  getAppVersionName?: () => string;
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
      networkConnected,
      networkType,
      canOpenAppSettings: false,
      supportsScopedPicker,
    };
  }

  let publicStorage: AndroidPermissionState = 'prompt';
  try {
    const status = await Filesystem.checkPermissions();
    const raw = status?.publicStorage || 'prompt';
    if (buildInfo.sdkInt !== null && buildInfo.sdkInt >= 33 && raw !== 'granted') {
      // Android 13+ uses Scoped Storage / SAF without legacy WRITE_EXTERNAL_STORAGE runtime dialog
      publicStorage = 'scoped';
    } else {
      publicStorage = raw as AndroidPermissionState;
    }
  } catch {
    publicStorage = buildInfo.sdkInt !== null && buildInfo.sdkInt >= 33 ? 'scoped' : 'prompt';
  }

  return {
    isNativeAndroid: true,
    platform: 'android',
    sdkInt: buildInfo.sdkInt,
    appVersion: buildInfo.appVersion,
    publicStorage,
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
  try {
    const res = await Filesystem.requestPermissions();
    const state = (res?.publicStorage || 'prompt') as AndroidPermissionState;

    if (state === 'granted') {
      return {
        granted: true,
        state: 'granted',
        message: 'Android storage permission granted for subtitle import & export.',
      };
    }

    if (buildInfo.sdkInt !== null && buildInfo.sdkInt >= 33) {
      return {
        granted: true,
        state: 'scoped',
        message:
          'Android 13+ uses Scoped Storage. File loading & Documents/UrduLocalizer export work without legacy permissions.',
      };
    }

    return {
      granted: false,
      state,
      message:
        state === 'denied'
          ? 'Storage permission was denied. Open Android App Settings to allow Files access, or use Android Share export.'
          : 'Storage permission not granted yet.',
    };
  } catch (err: any) {
    if (buildInfo.sdkInt !== null && buildInfo.sdkInt >= 30) {
      return {
        granted: true,
        state: 'scoped',
        message: 'Scoped Storage active for subtitle Documents & Share export.',
      };
    }
    return {
      granted: false,
      state: 'denied',
      message: err?.message || 'Unable to request Android storage permission.',
    };
  }
}

export async function exportSubtitleNativeAndroid(options: {
  fileName: string;
  content: string;
  saveMode: AndroidSaveMode;
}): Promise<{
  success: boolean;
  savedPath?: string;
  shared?: boolean;
  error?: string;
}> {
  const safeName = (options.fileName || 'subtitles.srt').replace(/[\\/:*?"<>|]/g, '_');
  const bomContent = options.content.startsWith('\ufeff') ? options.content : `\ufeff${options.content}`;

  // Ensure permission on Android <= 12 before writing to public Documents
  const permSnapshot = await getAndroidPermissionSnapshot();
  if (permSnapshot.publicStorage !== 'granted' && permSnapshot.publicStorage !== 'scoped') {
    await requestAndroidStoragePermission();
  }

  let savedRelativePath: string | undefined;
  let shareUri: string | undefined;

  // Step 1: Write to Documents/UrduLocalizer when mode includes documents
  if (options.saveMode === 'documents' || options.saveMode === 'documents-and-share') {
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

      savedRelativePath = `Documents/UrduLocalizer/${safeName}`;
      shareUri = writeRes.uri;
    } catch {
      // Fallback to app external storage if public Documents write is restricted on device OEM
      try {
        const extRes = await Filesystem.writeFile({
          path: targetPath,
          data: bomContent,
          directory: Directory.External,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        savedRelativePath = `Android/data/com.urdudubber.app/files/UrduLocalizer/${safeName}`;
        shareUri = extRes.uri;
      } catch {
        // Will fall back to Cache + Share sheet below
      }
    }
  }

  // Step 2: Open Share / Save-As Sheet if requested OR if Documents write failed
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
        savedPath: savedRelativePath,
        shared: true,
      };
    } catch (shareErr: any) {
      const msg = String(shareErr?.message || '');
      if (/cancel/i.test(msg) && savedRelativePath) {
        return {
          success: true,
          savedPath: savedRelativePath,
          shared: false,
        };
      }
      if (savedRelativePath) {
        return {
          success: true,
          savedPath: savedRelativePath,
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
      savedPath: savedRelativePath,
      shared: false,
    };
  }

  return {
    success: false,
    error: 'Failed to write subtitle file to Android storage.',
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
  onBackButton: () => boolean; // returns true if handled in-app, false to minimize/exit
  onIncomingFile: (payload: IncomingAndroidFilePayload) => void;
}): () => void {
  const cleanups: (() => void)[] = [];

  if (isNativeAndroid()) {
    void syncAndroidStatusBarTheme(handlers.isLightTheme);

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

    void CapApp.addListener('backButton', () => {
      const handled = handlers.onBackButton();
      if (!handled) {
        void CapApp.minimizeApp().catch(() => {
          void CapApp.exitApp().catch(() => {});
        });
      }
    }).then((h) => cleanups.push(() => { void h.remove(); })).catch(() => {});
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
