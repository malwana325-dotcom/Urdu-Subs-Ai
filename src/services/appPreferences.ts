import { AppTheme } from '../components/ThemeSelector';
import { SubtitleItem } from '../utils/srtParser';
import type { AndroidSaveMode } from './androidNative';

export type MobileTab = 'home' | 'translator' | 'workspace' | 'styling' | 'download' | 'menu';
export type MobileSubtitleView = 'cards' | 'table' | 'stream-switch' | 'compact';
export type ContainerSize = 'compact' | 'standard' | 'spacious';
export type DeveloperIconId = 'languages' | 'sparkles' | 'clapperboard' | 'film' | 'globe' | 'custom';
export type GoogleRoutingMode = 'hybrid' | 'web' | 'cloud';

export interface HeaderVisibilitySettings {
  compactMode: boolean;
  showFileName: boolean;
  showSaveIndicator: boolean;
  showZoomChip: boolean;
  showNetworkPill: boolean;
}

export interface MenuVisibilitySettings {
  showCinemaStudio: boolean;
  showEditStudio: boolean;
  showLogs: boolean;
  showQuickStats: boolean;
  showBackupSection: boolean;
}

export interface OptionalFeatureFlags {
  enableQcInspector: boolean;
  enableTermGlossary: boolean;
  showInfoGuides: boolean;
  autoSaveDrafts: boolean;
}

export interface NotificationPrefs {
  enabled: boolean;
  durationMs: number; // 1500 to 6000
  showWarnings: boolean;
  showSaveAlerts: boolean;
}

export interface UIFontPreset {
  id: string;
  label: string;
  value: string;
}

export const UI_FONT_OPTIONS: UIFontPreset[] = [
  { id: 'jakarta', label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" },
  { id: 'dm-sans', label: 'DM Sans', value: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" },
  { id: 'manrope', label: 'Manrope', value: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif" },
  { id: 'outfit', label: 'Outfit', value: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif" },
  { id: 'mono', label: 'JetBrains Mono', value: "'JetBrains Mono', ui-monospace, monospace" },
  { id: 'system', label: 'System Default', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
];

export interface DeveloperSettings {
  appName: string;
  appBadge: string;
  iconId: DeveloperIconId;
  customIconDataUrl: string;
  customBgCss: string;
  customSurfaceCss: string;
  customAccentHex: string;
  uiFontFamily: string;
}

export interface GlossaryEntry {
  id: string;
  sourceTerm: string;
  targetTranslation: string;
  enabled: boolean;
}

export interface AppPreferences {
  uiZoom: number; // 50 to 200
  theme: AppTheme;
  defaultStartupTab: MobileTab;
  mobileSubtitleView: MobileSubtitleView;
  containerSize: ContainerSize;
  containerPaddingPx: number; // 6 to 28
  workspaceHeaderVisible: boolean;
  workspaceBoxHeight: number; // 400 to 1600
  headerVisibility: HeaderVisibilitySettings;
  menuVisibility: MenuVisibilitySettings;
  optionalFeatures: OptionalFeatureFlags;
  notificationPrefs: NotificationPrefs;
  developerSettings: DeveloperSettings;
  defaultReadOnly: boolean;
  defaultPageSize: number; // 25 | 50 | 100 | 0
  googleRoutingMode: GoogleRoutingMode;
  androidSaveMode: AndroidSaveMode;
}

export const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettings = {
  appName: 'Urdu Localizer',
  appBadge: 'v3',
  iconId: 'languages',
  customIconDataUrl: '',
  customBgCss: '',
  customSurfaceCss: '',
  customAccentHex: '',
  uiFontFamily: UI_FONT_OPTIONS[0].value,
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  uiZoom: 100,
  theme: 'cinematic',
  defaultStartupTab: 'home',
  mobileSubtitleView: 'table',
  containerSize: 'standard',
  containerPaddingPx: 16,
  workspaceHeaderVisible: true,
  workspaceBoxHeight: 780,
  headerVisibility: {
    compactMode: false,
    showFileName: true,
    showSaveIndicator: true,
    showZoomChip: true,
    showNetworkPill: true,
  },
  menuVisibility: {
    showCinemaStudio: true,
    showEditStudio: true,
    showLogs: true,
    showQuickStats: true,
    showBackupSection: true,
  },
  optionalFeatures: {
    enableQcInspector: true,
    enableTermGlossary: true,
    showInfoGuides: true,
    autoSaveDrafts: true,
  },
  notificationPrefs: {
    enabled: true,
    durationMs: 3200,
    showWarnings: true,
    showSaveAlerts: true,
  },
  developerSettings: DEFAULT_DEVELOPER_SETTINGS,
  defaultReadOnly: true,
  defaultPageSize: 50,
  googleRoutingMode: 'hybrid',
  androidSaveMode: 'documents',
};

const PREFS_STORAGE_KEY = 'urdu_dubber_app_prefs_v1';
const GLOSSARY_STORAGE_KEY = 'urdu_dubber_glossary_v1';

export function clampContainerPadding(val: number): number {
  if (!Number.isFinite(val)) return 16;
  return Math.min(28, Math.max(6, Math.round(val)));
}

export function containerSizeToPadding(size: ContainerSize): number {
  if (size === 'compact') return 10;
  if (size === 'spacious') return 22;
  return 16;
}

export function paddingToContainerSize(px: number): ContainerSize {
  if (px <= 12) return 'compact';
  if (px >= 20) return 'spacious';
  return 'standard';
}

export function loadAppPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      const legacyTheme = localStorage.getItem('applet_theme') as AppTheme | null;
      if (legacyTheme && ['classic', 'cinematic', 'cyber', 'neon', 'sapphire', 'amber'].includes(legacyTheme)) {
        return { ...DEFAULT_APP_PREFERENCES, theme: legacyTheme };
      }
      return DEFAULT_APP_PREFERENCES;
    }
    const parsed = JSON.parse(raw);
    const derivedPad = parsed?.containerPaddingPx !== undefined
      ? clampContainerPadding(Number(parsed.containerPaddingPx))
      : containerSizeToPadding(parsed?.containerSize || 'standard');

    return {
      ...DEFAULT_APP_PREFERENCES,
      ...parsed,
      uiZoom: clampZoom(Number(parsed?.uiZoom ?? 100)),
      containerPaddingPx: derivedPad,
      containerSize: parsed?.containerSize || paddingToContainerSize(derivedPad),
      workspaceHeaderVisible: parsed?.workspaceHeaderVisible ?? true,
      headerVisibility: {
        ...DEFAULT_APP_PREFERENCES.headerVisibility,
        ...(parsed?.headerVisibility || {}),
      },
      menuVisibility: {
        ...DEFAULT_APP_PREFERENCES.menuVisibility,
        ...(parsed?.menuVisibility || {}),
      },
      optionalFeatures: {
        ...DEFAULT_APP_PREFERENCES.optionalFeatures,
        ...(parsed?.optionalFeatures || {}),
      },
      notificationPrefs: {
        ...DEFAULT_APP_PREFERENCES.notificationPrefs,
        ...(parsed?.notificationPrefs || {}),
      },
      developerSettings: {
        ...DEFAULT_DEVELOPER_SETTINGS,
        ...(parsed?.developerSettings || {}),
      },
      googleRoutingMode:
        parsed?.googleRoutingMode === 'web' || parsed?.googleRoutingMode === 'cloud' || parsed?.googleRoutingMode === 'hybrid'
          ? parsed.googleRoutingMode
          : 'hybrid',
      androidSaveMode:
        parsed?.androidSaveMode === 'documents' ||
        parsed?.androidSaveMode === 'documents-and-share' ||
        parsed?.androidSaveMode === 'share'
          ? parsed.androidSaveMode
          : 'documents',
    };
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function saveAppPreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    localStorage.setItem('applet_theme', prefs.theme);
  } catch {
    // Ignore storage quota errors
  }
}

export function clampZoom(val: number): number {
  if (!Number.isFinite(val)) return 100;
  return Math.min(200, Math.max(50, Math.round(val)));
}

function hexToRgba(hex: string, alpha: number): string | null {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyPreferencesToDOM(prefs: AppPreferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const zoomFactor = clampZoom(prefs.uiZoom) / 100;
  const padPx = clampContainerPadding(prefs.containerPaddingPx ?? containerSizeToPadding(prefs.containerSize));
  const cardPadPx = Math.max(6, Math.round(padPx * 0.85));
  const cardGapPx = Math.max(4, Math.round(padPx * 0.68));

  root.style.setProperty('--ui-zoom', String(zoomFactor));
  root.style.setProperty('--container-pad', `${padPx}px`);
  root.style.setProperty('--card-pad', `${cardPadPx}px`);
  root.style.setProperty('--card-gap', `${cardGapPx}px`);

  root.setAttribute('data-container-size', paddingToContainerSize(padPx));
  root.setAttribute('data-app-theme', prefs.theme);
  if (prefs.theme !== 'classic') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  if (!prefs.optionalFeatures.showInfoGuides) {
    root.setAttribute('data-hide-info-guides', 'true');
  } else {
    root.removeAttribute('data-hide-info-guides');
  }

  // Apply Developer Settings CSS Overrides cleanly
  const dev = prefs.developerSettings || DEFAULT_DEVELOPER_SETTINGS;
  if (dev.customBgCss && dev.customBgCss.trim()) {
    root.style.setProperty('--theme-canvas', dev.customBgCss.trim());
  } else {
    root.style.removeProperty('--theme-canvas');
  }

  if (dev.customSurfaceCss && dev.customSurfaceCss.trim()) {
    root.style.setProperty('--theme-surface', dev.customSurfaceCss.trim());
    root.style.setProperty('--theme-elevated', dev.customSurfaceCss.trim());
  } else {
    root.style.removeProperty('--theme-surface');
    root.style.removeProperty('--theme-elevated');
  }

  if (dev.customAccentHex && dev.customAccentHex.trim()) {
    const accent = dev.customAccentHex.trim();
    root.style.setProperty('--theme-accent', accent);
    root.style.setProperty('--theme-accent-text', accent);
    const soft = hexToRgba(accent, 0.16);
    if (soft) {
      root.style.setProperty('--theme-accent-soft', soft);
    }
  } else {
    root.style.removeProperty('--theme-accent');
    root.style.removeProperty('--theme-accent-text');
    root.style.removeProperty('--theme-accent-soft');
  }

  if (dev.uiFontFamily && dev.uiFontFamily.trim()) {
    root.style.setProperty('--ui-font', dev.uiFontFamily.trim());
  } else {
    root.style.removeProperty('--ui-font');
  }
}

export function loadGlossary(): GlossaryEntry[] {
  try {
    const raw = localStorage.getItem(GLOSSARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGlossary(entries: GlossaryEntry[]): void {
  try {
    localStorage.setItem(GLOSSARY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage errors
  }
}

export function buildGlossaryInstruction(entries: GlossaryEntry[]): string {
  const active = entries.filter(e => e.enabled && e.sourceTerm.trim() && e.targetTranslation.trim());
  if (active.length === 0) return '';
  const lines = active.map(e => `- "${e.sourceTerm.trim()}" => "${e.targetTranslation.trim()}"`);
  return `\n\nMANDATORY CHARACTER & TERM GLOSSARY (Always use these exact localized spellings/translations):\n${lines.join('\n')}`;
}

export interface SubtitleQcIssue {
  highCps: boolean;
  emptyTranslation: boolean;
  overlapWithNext: boolean;
  shortDuration: boolean;
  cps: number;
  durationSec: number;
}

export interface FullAppBackup {
  version: number;
  appName: string;
  exportedAt: string;
  preferences: AppPreferences;
  glossary: GlossaryEntry[];
  activeProject: {
    fileName: string;
    detectedFormat: string;
    subtitles: SubtitleItem[];
    context: string;
    customPrompt: string;
    translationSettings: any;
    activeStylingConfig: any;
  };
  drafts: any[];
}
