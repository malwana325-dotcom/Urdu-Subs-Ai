import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Palette, 
  Sparkles, 
  X, 
  Sliders, 
  Layers, 
  Download, 
  Eye, 
  RotateCcw, 
  Film, 
  FileCode, 
  Type, 
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkPlus,
  Save,
  Upload,
  Trash2,
  Edit2,
  Check,
  Copy,
  ArrowLeftRight,
  Plus,
  Search,
  FolderHeart,
  Pipette,
  Sun,
  Shuffle
} from 'lucide-react';
import { ColorWheelPicker } from './ColorWheelPicker';
import { 
  GRADIENT_PALETTES, 
  GradientPalette, 
  GradientMode, 
  TargetStreamField,
  applyGradientsToSubtitles, 
  removeAllGradientsFromSubtitles,
  generateFormattedSRT,
  generateASS,
  generateSSA,
  generateWebVTT,
  generateCleanSRT
} from '../utils/subtitleFormatter';
import { SubtitleItem } from '../utils/srtParser';
import { RightEdgeDrawerShell } from './RightEdgeDrawerShell';
import { cn } from '../utils/cn';

export interface GradientStop {
  id: string;
  color: string;
  offset: number; // 0 - 100%
}

export interface ActiveStylingConfig {
  paletteId: string;
  gradientMode: GradientMode;
  targetStreams: TargetStreamField; // 'all' | 'both' | 'translated' | 'original' | 'google'
  customColors?: string[];
  gradientDirection?: '135deg' | '90deg' | '45deg' | '180deg';
  animation?: 'none' | 'karaoke-fade' | 'pulse-glow' | 'wave-bounce' | 'neon-flicker' | 'typewriter' | 'cinema-zoom' | 'audio-ripple' | 'shimmer';
  textOutline?: 'none' | 'subtle' | 'medium' | 'bold' | 'ultra' | 'neon' | 'double' | 'emboss';
  outlineWidth?: number;
  customOutlineColor?: string;
  outlineOpacity?: number;
  strokeIndependent?: boolean;
  strokeXWidth?: number;
  strokeYWidth?: number;
  borderStyle?: 1 | 3;
  textShadow?: 'none' | 'soft' | 'hard' | 'cinematic' | 'neon-glow' | 'backlight' | 'retro-drop' | 'extrusion-3d' | 'cyberpunk-glitch' | 'fiery-blaze';
  customShadowColor?: string;
  shadowDepth?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  glowActive?: boolean;
  glowBlur?: number;
  glowColor?: string;
  glowOpacity?: number;
  edgeBlurMode?: 'gaussian' | 'simple';
  edgeBlurStrength?: number;
  highlightActive?: boolean;
  highlightColor?: string;
  highlightOpacity?: number;
  highlightMode?: 'accent' | 'karaoke' | 'specular';
  backdropBox?: 'none' | 'subtle-box' | 'heavy-tint' | 'frost-blur' | 'tinted-palette' | 'cinema-black' | 'glowing-border' | 'comic-bubble' | 'accent-bar';
  backdropPadding?: 'minimal' | 'compact' | 'standard' | 'spacious';
  backdropRadius?: 'none' | 'rounded' | 'smooth' | 'pill';
  backdropOpacity?: number;
  backdropBlur?: number;
  customBackdropColor?: string;
  fontWeight?: '300' | '400' | '500' | '600' | '700' | '800' | '900';
  letterSpacing?: '-1.5px' | '-1px' | '0px' | '1px' | '2px' | '3px' | '4px';
  lineHeight?: '1.3' | '1.6' | '2.0' | '2.4' | '2.8';
  textAlign?: 'auto' | 'left' | 'center' | 'right' | 'justify';
  transformCase?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  boldEmphasis?: boolean;
  italicize?: boolean;
  underline?: boolean;
  isLivePreviewActive?: boolean;
}

export const DEFAULT_STYLING_CONFIG: ActiveStylingConfig = {
  paletteId: 'sunset',
  gradientMode: 'block-shift',
  targetStreams: 'all',
  gradientDirection: '135deg',
  animation: 'none',
  textOutline: 'none',
  outlineWidth: 0,
  customOutlineColor: '#000000',
  outlineOpacity: 1,
  strokeIndependent: false,
  strokeXWidth: 0,
  strokeYWidth: 0,
  borderStyle: 1,
  textShadow: 'none',
  customShadowColor: '#000000',
  shadowDepth: 0,
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowOpacity: 0.85,
  glowActive: false,
  glowBlur: 0,
  glowColor: '#00F5D4',
  glowOpacity: 0.85,
  edgeBlurMode: 'gaussian',
  edgeBlurStrength: 0,
  highlightActive: false,
  highlightColor: '#FFD700',
  highlightOpacity: 1,
  highlightMode: 'accent',
  backdropBox: 'none',
  backdropPadding: 'compact',
  backdropRadius: 'rounded',
  backdropOpacity: 0.65,
  backdropBlur: 0,
  customBackdropColor: '#000000',
  fontWeight: '500',
  letterSpacing: '0px',
  lineHeight: '2.0',
  textAlign: 'auto',
  transformCase: 'none',
  boldEmphasis: false,
  italicize: false,
  underline: false,
  isLivePreviewActive: true
};

export interface StylingPreset {
  id: string;
  name: string;
  config: ActiveStylingConfig;
  urduFont: string;
  englishFont: string;
  fontSize: number;
  isCustom?: boolean;
}

export const BUILT_IN_PRESETS: StylingPreset[] = [
  {
    id: 'sunset-cinema',
    name: 'Sunset Radiance',
    urduFont: "'Noto Nastaliq Urdu', 'Gulzar', serif",
    englishFont: "'Plus Jakarta Sans', sans-serif",
    fontSize: 24,
    config: {
      ...DEFAULT_STYLING_CONFIG,
      paletteId: 'sunset',
      gradientMode: 'block-shift',
      targetStreams: 'all'
    }
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    urduFont: "'Noto Sans Arabic', 'Noto Nastaliq Urdu', sans-serif",
    englishFont: "'JetBrains Mono', monospace",
    fontSize: 26,
    config: {
      ...DEFAULT_STYLING_CONFIG,
      paletteId: 'cyber-neon',
      gradientMode: 'word-gradient',
      targetStreams: 'all'
    }
  },
  {
    id: 'golden-amber',
    name: 'Golden Amber',
    urduFont: "'Noto Nastaliq Urdu', 'Gulzar', serif",
    englishFont: "'Cinzel', serif",
    fontSize: 26,
    config: {
      ...DEFAULT_STYLING_CONFIG,
      paletteId: 'golden-amber',
      gradientMode: 'block-shift',
      targetStreams: 'all'
    }
  }
];

// Curated solid subtitle colors
export interface SolidColorPreset {
  name: string;
  hex: string;
  desc: string;
}

export const SOLID_SUBTITLE_COLORS: SolidColorPreset[] = [
  { name: 'Cinema Yellow', hex: '#FFE600', desc: 'Standard high-contrast movie yellow' },
  { name: 'Pure White', hex: '#FFFFFF', desc: 'Crisp classic cinema subtitle white' },
  { name: 'Electric Cyan', hex: '#00F5D4', desc: 'Cyberpunk & punchy modern teal' },
  { name: 'Amber Gold', hex: '#F59E0B', desc: 'Warm prestige golden luster' },
  { name: 'Neon Emerald', hex: '#10B981', desc: 'Vibrant documentary & nature mint' },
  { name: 'Hot Pink / Magenta', hex: '#F43F5E', desc: 'Vibrant music video & anime flare' },
  { name: 'Pastel Lilac', hex: '#C084FC', desc: 'Soft aesthetic modern lavender' },
  { name: 'Sky Marine', hex: '#38BDF8', desc: 'Clean bright celestial blue' },
  { name: 'Blaze Tangerine', hex: '#F97316', desc: 'Energetic action & warmth' },
  { name: 'Crimson Ruby', hex: '#EF4444', desc: 'Dramatic intense red' },
  { name: 'Broadcast Lime', hex: '#84CC16', desc: 'Punchy eye-catching lime' },
  { name: 'Silver Platinum', hex: '#E4E4E7', desc: 'Subtle metallic cinema grey' }
];

// 12 Gradient Progression Modes
export const GRADIENT_PROGRESSION_MODES: {
  id: GradientMode;
  label: string;
  desc: string;
  tag: string;
}[] = [
  { 
    id: 'block-shift', 
    label: 'Continuous Block Shift', 
    desc: 'Each subtitle shifts colors smoothly across timeline.',
    tag: 'Timeline'
  },
  { 
    id: 'word-gradient', 
    label: 'Word-by-Word Transition', 
    desc: 'Words in each line smoothly transition across colors.',
    tag: 'Linear'
  },
  { 
    id: 'alternating-speakers', 
    label: 'Alternating Speakers', 
    desc: 'Alternates dialogue colors between speakers/lines.',
    tag: 'Dialogue'
  },
  { 
    id: 'ping-pong', 
    label: 'Ping-Pong Reversal', 
    desc: 'Oscillates forward then backward through colors.',
    tag: 'Dynamic'
  },
  { 
    id: 'first-last-accent', 
    label: 'Anchor Accent Ends', 
    desc: 'First & last words accented with vibrant ends of palette.',
    tag: 'Anchors'
  },
  { 
    id: 'center-out', 
    label: 'Center-Out Flare', 
    desc: 'Center climax word radiates outward to edge stops.',
    tag: 'Radial'
  },
  { 
    id: 'odd-even-words', 
    label: 'Odd/Even Word Stride', 
    desc: 'Even words get Color A, odd words get Color B.',
    tag: 'Rhythm'
  },
  { 
    id: 'random-scatter', 
    label: 'Chromatic Scatter', 
    desc: 'Deterministic multi-color scatter across each phrase.',
    tag: 'Creative'
  },
  { 
    id: 'rainbow-cycle', 
    label: 'Spectral Loop', 
    desc: 'Full palette looped across words continuously.',
    tag: 'Spectrum'
  },
  { 
    id: 'tri-color-split', 
    label: 'Tri-Color Narrative Split', 
    desc: 'Divides line into Opening, Body & Climax thirds.',
    tag: 'Story'
  },
  { 
    id: 'syllable-karaoke', 
    label: 'Karaoke Step Wave', 
    desc: 'High-contrast vibrant jump highlight on key terms.',
    tag: 'Karaoke'
  },
  { 
    id: 'gradient-glow', 
    label: 'Radiant Accent Glow', 
    desc: 'Rich chromatic lead tone with radiant accentuation.',
    tag: 'Accent'
  }
];

// Persistent User-Saveable Gradient Library Interface
export interface SavedGradientPalette {
  id: string;
  name: string;
  description?: string;
  colors: string[];
  gradientMode?: GradientMode;
  createdAt: number;
  tags?: string[];
}

const GRADIENT_LIBRARY_STORAGE_KEY = 'urdu_subtitles_gradient_library_v1';

export const STARTER_LIBRARY_PALETTES: SavedGradientPalette[] = [
  {
    id: 'starter-1',
    name: 'Imperial Saffron & Ruby',
    description: 'Golden saffron transitioning into warm ruby for high-end drama',
    colors: ['#FBBF24', '#F59E0B', '#EF4444'],
    gradientMode: 'word-gradient',
    createdAt: 1718000000000,
    tags: ['Prestige', 'Warm']
  },
  {
    id: 'starter-2',
    name: 'Synthwave Nightfall',
    description: 'Electric cyan to deep synth violet and hot fuchsia',
    colors: ['#00F5D4', '#7928CA', '#FF007A'],
    gradientMode: 'word-gradient',
    createdAt: 1718010000000,
    tags: ['Sci-Fi', 'Vibrant']
  },
  {
    id: 'starter-3',
    name: 'Viral Gold Punch',
    description: 'High-contrast bright yellow with punchy tangerine highlight',
    colors: ['#FFF200', '#FFA000', '#FF5500'],
    gradientMode: 'syllable-karaoke',
    createdAt: 1718020000000,
    tags: ['Social', 'High Contrast']
  },
  {
    id: 'starter-4',
    name: 'Diamond Ice & Oceanic Blue',
    description: 'Frosty white to arctic cyan and deep maritime navy',
    colors: ['#FFFFFF', '#67E8F9', '#0284C7'],
    gradientMode: 'center-out',
    createdAt: 1718030000000,
    tags: ['Cool', 'Clean']
  }
];

interface StylingStudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  onApply: (styledSubtitles: SubtitleItem[]) => void;
  urduFont: string;
  onUpdateUrduFont?: (font: string) => void;
  originalFont?: string;
  onUpdateOriginalFont?: (font: string) => void;
  translatedFontSize: number;
  onUpdateTranslatedFontSize?: (size: number) => void;
  originalFontSize?: number;
  onUpdateOriginalFontSize?: (size: number) => void;
  fileName: string;
  activeStylingConfig?: ActiveStylingConfig;
  onUpdateActiveStyling?: (config: ActiveStylingConfig) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddNotification: (msg: string, type: 'success' | 'error') => void;
}

export const StylingStudioDrawer: React.FC<StylingStudioDrawerProps> = ({
  isOpen,
  onClose,
  subtitles,
  onApply,
  urduFont,
  onUpdateUrduFont,
  originalFont = 'sans-serif',
  onUpdateOriginalFont,
  translatedFontSize: initialTranslatedFontSize,
  onUpdateTranslatedFontSize,
  originalFontSize: initialOriginalFontSize = 14,
  onUpdateOriginalFontSize,
  fileName,
  activeStylingConfig,
  onUpdateActiveStyling,
  onAddLog,
  onAddNotification
}) => {
  // Collapsible drop-down menu sections inside the right-edge Gradient Studio drawer
  const [openMenus, setOpenMenus] = useState<{
    preview: boolean;
    streams: boolean;
    modes: boolean;
    palettes: boolean;
    builder: boolean;
    solid: boolean;
    library: boolean;
  }>({
    preview: true,
    streams: true,
    modes: false,
    palettes: true,
    builder: false,
    solid: false,
    library: false,
  });

  const toggleMenuSection = (key: keyof typeof openMenus) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Isolated local draft configuration (changes stay on preview screen until applied)
  const [draftConfig, setDraftConfig] = useState<ActiveStylingConfig>(activeStylingConfig || DEFAULT_STYLING_CONFIG);

  // Video backdrop simulation for in-drawer preview
  const [videoBackdrop, setVideoBackdrop] = useState<'cinema-dark' | 'city-night' | 'sunset' | 'cyber' | 'studio-light'>('cinema-dark');

  // Stream preview visibility toggles in drawer
  const [previewStreams, setPreviewStreams] = useState({
    original: true,
    ai: true,
    google: true
  });

  // Local fonts & sizing for studio preview
  const [activeUrduFont, setActiveUrduFont] = useState(urduFont);
  const [activeEnglishFont, setActiveEnglishFont] = useState(originalFont);
  const [previewFontSize, setPreviewFontSize] = useState(initialTranslatedFontSize || 24);

  // Multi-step gradient stops state for interactive palette builder
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(() => {
    const initialColors = activeStylingConfig?.customColors || GRADIENT_PALETTES[0].colors;
    return initialColors.map((color, idx) => ({
      id: `stop-${idx}`,
      color,
      offset: Math.round((idx / Math.max(1, initialColors.length - 1)) * 100)
    }));
  });
  const [activeStopId, setActiveStopId] = useState<string>(gradientStops[0]?.id || 'stop-0');

  // Solid Color Custom Picker
  const [customSolidColor, setCustomSolidColor] = useState('#FFE600');

  // Export menu dropdown open/close state in footer
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // User-Saveable Gradient Library State
  const [savedPalettes, setSavedPalettes] = useState<SavedGradientPalette[]>(() => {
    try {
      const stored = localStorage.getItem(GRADIENT_LIBRARY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load gradient library from localStorage", e);
    }
    return STARTER_LIBRARY_PALETTES;
  });

  const [librarySearch, setLibrarySearch] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savePaletteName, setSavePaletteName] = useState('');
  const [savePaletteDesc, setSavePaletteDesc] = useState('');
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null);
  const [editingPaletteName, setEditingPaletteName] = useState('');

  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Persist library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GRADIENT_LIBRARY_STORAGE_KEY, JSON.stringify(savedPalettes));
    } catch (e) {
      console.warn("Failed saving gradient library to localStorage", e);
    }
  }, [savedPalettes]);

  // Synchronize isolated draft state when drawer opens from current project styling
  useEffect(() => {
    if (isOpen) {
      if (activeStylingConfig) {
        setDraftConfig({ ...activeStylingConfig });
        if (activeStylingConfig.customColors && activeStylingConfig.customColors.length > 0) {
          const syncedStops = activeStylingConfig.customColors.map((color, idx) => ({
            id: `stop-${idx}`,
            color,
            offset: Math.round((idx / Math.max(1, activeStylingConfig.customColors!.length - 1)) * 100)
          }));
          setGradientStops(syncedStops);
          setActiveStopId(syncedStops[0]?.id || 'stop-0');
        }
      }
      setActiveUrduFont(urduFont);
      setActiveEnglishFont(originalFont);
      setPreviewFontSize(initialTranslatedFontSize || 24);
      setIsExportMenuOpen(false);
    }
  }, [isOpen, activeStylingConfig, urduFont, originalFont, initialTranslatedFontSize]);

  // Alias draftConfig to config
  const config = draftConfig;

  // Local draft updater: strictly isolated to the studio preview screen
  const updateConfig = (patch: Partial<ActiveStylingConfig>) => {
    setDraftConfig(prev => ({ ...prev, ...patch }));
  };

  const selectedPalette = GRADIENT_PALETTES.find(p => p.id === config.paletteId) || GRADIENT_PALETTES[0];

  // Active color stops sorted by offset for gradient CSS
  const sortedStops = useMemo(() => {
    return [...gradientStops].sort((a, b) => a.offset - b.offset);
  }, [gradientStops]);

  // The active stop object being edited
  const activeStop = useMemo(() => {
    return gradientStops.find(s => s.id === activeStopId) || gradientStops[0] || { id: 'stop-0', color: '#FF5500', offset: 0 };
  }, [gradientStops, activeStopId]);

  // CSS linear-gradient string for track and preview
  const trackGradientCss = useMemo(() => {
    if (sortedStops.length === 0) return '#FF5500';
    return `linear-gradient(to right, ${sortedStops.map(s => `${s.color} ${s.offset}%`).join(', ')})`;
  }, [sortedStops]);

  // Dynamic preview sample items
  const sampleItems: SubtitleItem[] = subtitles.slice(0, 2).length > 0 
    ? subtitles.slice(0, 2) 
    : [
        { 
          index: 1, 
          startTime: '00:00:01,000', 
          endTime: '00:00:04,500', 
          text: 'Every cinematic journey begins with an unspoken truth.', 
          translatedText: 'ہر عظیم فلمی سفر ایک ان کہی سچائی سے شروع ہوتا ہے۔',
          googleTranslateText: 'ہر عظیم سنیما کا سفر ایک ناگفتہ بہ حقیقت سے شروع ہوتا ہے۔'
        },
        { 
          index: 2, 
          startTime: '00:00:05,000', 
          endTime: '00:00:09,200', 
          text: 'Colors harmonize between the silence and spoken words.', 
          translatedText: 'خاموشی اور الفاظ کے درمیان رنگ ہم آہنگ ہو جاتے ہیں۔',
          googleTranslateText: 'خاموشی اور بولے جانے والے الفاظ کے درمیان رنگ ہم آہنگ ہوتے ہیں۔'
        }
      ];

  const styledSampleItems = useMemo(() => {
    return applyGradientsToSubtitles(
      sampleItems, 
      config.paletteId, 
      config.gradientMode, 
      config.targetStreams,
      {
        customColors: config.customColors,
        boldEmphasis: config.boldEmphasis,
        italicize: config.italicize,
        uppercaseOriginal: config.transformCase === 'uppercase'
      }
    );
  }, [sampleItems, config]);

  const handleApplyToSubtitles = () => {
    if (subtitles.length === 0) {
      onAddNotification("No subtitles loaded in project", "error");
      return;
    }

    const styled = applyGradientsToSubtitles(
      subtitles, 
      config.paletteId, 
      config.gradientMode, 
      config.targetStreams,
      {
        customColors: config.customColors,
        boldEmphasis: config.boldEmphasis,
        italicize: config.italicize,
        uppercaseOriginal: config.transformCase === 'uppercase'
      }
    );

    onApply(styled);
    if (onUpdateActiveStyling) onUpdateActiveStyling(draftConfig);
    if (onUpdateUrduFont) onUpdateUrduFont(activeUrduFont);
    if (onUpdateOriginalFont) onUpdateOriginalFont(activeEnglishFont);
    if (onUpdateTranslatedFontSize) onUpdateTranslatedFontSize(previewFontSize);

    onAddLog(`Applied "${config.customColors ? 'Custom Multi-Step Palette' : selectedPalette.name}" (${draftConfig.gradientMode}) gradient styles across ${draftConfig.targetStreams} streams to ${subtitles.length} subtitles.`, 'success');
    onAddNotification(`Gradient styling applied successfully! Subtitles updated.`, 'success');
    onClose();
  };

  const handleClearAllFormatting = () => {
    if (subtitles.length === 0) return;
    const clean = removeAllGradientsFromSubtitles(subtitles);
    onApply(clean);
    if (onUpdateActiveStyling) onUpdateActiveStyling(DEFAULT_STYLING_CONFIG);
    setDraftConfig(DEFAULT_STYLING_CONFIG);
    onAddLog(`Cleared all formatting tags and restored plain subtitles.`, 'info');
    onAddNotification("Cleared all formatting and styles from subtitles", "success");
    onClose();
  };

  // Direct export
  const handleDirectDownload = (format: 'srt' | 'ssa' | 'ass' | 'vtt' | 'clean' | 'json') => {
    if (subtitles.length === 0) {
      onAddNotification("No subtitles to export", "error");
      return;
    }

    const itemsToExport = applyGradientsToSubtitles(
      subtitles, 
      config.paletteId, 
      config.gradientMode, 
      config.targetStreams,
      {
        customColors: config.customColors,
        boldEmphasis: config.boldEmphasis,
        italicize: config.italicize,
        uppercaseOriginal: config.transformCase === 'uppercase'
      }
    );

    const baseName = (fileName || 'subtitles').replace(/\.[^/.]+$/, '').replace(/[^a-z0-9_-]/gi, '_');
    const timestamp = Date.now();
    let content = '';
    let mimeType = 'text/plain;charset=utf-8';
    let fileExt = 'srt';

    if (format === 'srt') {
      content = generateFormattedSRT(itemsToExport, config.targetStreams === 'original' ? 'original' : 'ai');
      mimeType = 'text/srt;charset=utf-8';
      fileExt = 'formatted.srt';
    } else if (format === 'ass') {
      content = generateASS(itemsToExport, {
        fontFamily: activeUrduFont,
        fontSize: previewFontSize || 38,
        title: baseName,
        type: config.targetStreams === 'original' ? 'original' : 'ai',
        palette: selectedPalette,
        stylingConfig: config
      });
      mimeType = 'text/x-ssa;charset=utf-8';
      fileExt = 'ass';
    } else if (format === 'ssa') {
      content = generateSSA(itemsToExport, {
        fontFamily: activeUrduFont,
        fontSize: previewFontSize || 38,
        title: baseName,
        type: config.targetStreams === 'original' ? 'original' : 'ai',
        palette: selectedPalette,
        stylingConfig: config
      });
      mimeType = 'text/x-ssa;charset=utf-8';
      fileExt = 'ssa';
    } else if (format === 'vtt') {
      content = generateWebVTT(itemsToExport, config.targetStreams === 'original' ? 'original' : 'ai');
      mimeType = 'text/vtt;charset=utf-8';
      fileExt = 'vtt';
    } else if (format === 'clean') {
      content = generateCleanSRT(itemsToExport, config.targetStreams === 'original' ? 'original' : 'ai');
      mimeType = 'text/srt;charset=utf-8';
      fileExt = 'clean.srt';
    } else if (format === 'json') {
      content = JSON.stringify(itemsToExport, null, 2);
      mimeType = 'application/json;charset=utf-8';
      fileExt = 'styled.json';
    }

    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_${format}_${timestamp}.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 20000);

    onAddNotification(`Downloaded stylized .${fileExt}`, "success");
    onAddLog(`Saved stylized subtitles as .${fileExt}: ${a.download}`, 'success');
  };

  // Helper to commit stops changes to draft config
  const commitStops = (newStops: GradientStop[]) => {
    setGradientStops(newStops);
    const sorted = [...newStops].sort((a, b) => a.offset - b.offset);
    updateConfig({ customColors: sorted.map(s => s.color) });
  };

  // Interactive Track Click: add stop at exact percentage position
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const offset = Math.round(Math.max(0, Math.min(100, (clickX / rect.width) * 100)));

    const newStop: GradientStop = {
      id: `stop-${Date.now()}`,
      color: activeStop ? activeStop.color : '#00F5D4',
      offset
    };

    const updated = [...gradientStops, newStop];
    commitStops(updated);
    setActiveStopId(newStop.id);
    onAddNotification(`Added stop at ${offset}%`, 'success');
  };

  // Update active stop's color
  const handleUpdateActiveStopColor = (colorHex: string) => {
    const updated = gradientStops.map(s => {
      if (s.id === activeStop.id) {
        return { ...s, color: colorHex };
      }
      return s;
    });
    commitStops(updated);
  };

  // Update active stop's percentage offset
  const handleUpdateActiveStopOffset = (offset: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(offset)));
    const updated = gradientStops.map(s => {
      if (s.id === activeStop.id) {
        return { ...s, offset: clamped };
      }
      return s;
    });
    commitStops(updated);
  };

  // Delete active stop
  const handleDeleteActiveStop = () => {
    if (gradientStops.length <= 2) {
      onAddNotification("A gradient palette requires at least 2 color stops", "error");
      return;
    }
    const updated = gradientStops.filter(s => s.id !== activeStop.id);
    commitStops(updated);
    setActiveStopId(updated[0]?.id || 'stop-0');
    onAddNotification("Removed color stop", "success");
  };

  // Duplicate active stop
  const handleDuplicateActiveStop = () => {
    const newOffset = Math.min(100, activeStop.offset + 10);
    const newStop: GradientStop = {
      id: `stop-${Date.now()}`,
      color: activeStop.color,
      offset: newOffset
    };
    const updated = [...gradientStops, newStop];
    commitStops(updated);
    setActiveStopId(newStop.id);
    onAddNotification("Duplicated color stop", "success");
  };

  // Distribute stops evenly along 0% - 100%
  const handleDistributeStopsEvenly = () => {
    const sorted = [...gradientStops].sort((a, b) => a.offset - b.offset);
    const count = sorted.length;
    if (count <= 1) return;
    const updated = sorted.map((s, idx) => ({
      ...s,
      offset: Math.round((idx / (count - 1)) * 100)
    }));
    commitStops(updated);
    onAddNotification("Distributed color stops evenly", "success");
  };

  // Reverse stops order
  const handleReversePalette = () => {
    const reversed = gradientStops.map(s => ({
      ...s,
      offset: 100 - s.offset
    })).sort((a, b) => a.offset - b.offset);
    commitStops(reversed);
    onAddNotification("Reversed gradient progression", "success");
  };

  // Quick Multi-Step Presets (2, 3, 4, 5 steps)
  const handleApplyStepPreset = (stepCount: 2 | 3 | 4 | 5) => {
    let presetColors: string[] = [];
    if (stepCount === 2) {
      presetColors = ['#FFE259', '#FFA751'];
    } else if (stepCount === 3) {
      presetColors = ['#00F5D4', '#7928CA', '#FF007A'];
    } else if (stepCount === 4) {
      presetColors = ['#38BDF8', '#818CF8', '#C084FC', '#F43F5E'];
    } else {
      presetColors = ['#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6'];
    }

    const newStops: GradientStop[] = presetColors.map((color, idx) => ({
      id: `stop-${Date.now()}-${idx}`,
      color,
      offset: Math.round((idx / (stepCount - 1)) * 100)
    }));

    commitStops(newStops);
    setActiveStopId(newStops[0].id);
    onAddNotification(`Applied ${stepCount}-Step Gradient Preset`, "success");
  };

  // Solid Color Handlers
  const handleSelectSolidColor = (hex: string) => {
    setCustomSolidColor(hex);
    updateConfig({
      paletteId: 'solid-custom',
      customColors: [hex],
      gradientMode: 'block-shift'
    });
    onAddNotification(`Selected solid color ${hex}`, "success");
  };

  // Gradient Library Handlers
  const handleOpenSaveModal = () => {
    setSavePaletteName(config.customColors ? 'Custom Multi-Step Gradient' : selectedPalette.name);
    setSavePaletteDesc(`A ${gradientStops.length}-step gradient with ${config.gradientMode} progression`);
    setIsSaveModalOpen(true);
  };

  const handleSaveToLibrary = () => {
    if (!savePaletteName.trim()) {
      onAddNotification("Please provide a palette name", "error");
      return;
    }

    const colorsToSave = sortedStops.map(s => s.color);
    const newSaved: SavedGradientPalette = {
      id: `palette-${Date.now()}`,
      name: savePaletteName.trim(),
      description: savePaletteDesc.trim() || undefined,
      colors: colorsToSave,
      gradientMode: config.gradientMode,
      createdAt: Date.now(),
      tags: [config.gradientMode, `${colorsToSave.length} Steps`]
    };

    setSavedPalettes(prev => [newSaved, ...prev]);
    setIsSaveModalOpen(false);
    onAddNotification(`Saved "${newSaved.name}" to your Gradient Library!`, "success");
    onAddLog(`Saved palette "${newSaved.name}" (${colorsToSave.join(', ')}) to persistent Gradient Library.`, 'success');
  };

  const handleLoadSavedPalette = (p: SavedGradientPalette) => {
    const newStops: GradientStop[] = p.colors.map((color, idx) => ({
      id: `stop-${Date.now()}-${idx}`,
      color,
      offset: Math.round((idx / Math.max(1, p.colors.length - 1)) * 100)
    }));
    commitStops(newStops);
    updateConfig({
      paletteId: p.id,
      customColors: [...p.colors],
      gradientMode: p.gradientMode || config.gradientMode
    });
    setActiveStopId(newStops[0]?.id || 'stop-0');
    onAddNotification(`Loaded "${p.name}" into active styling preview`, "success");
  };

  const handleApplySavedPaletteDirectly = (p: SavedGradientPalette) => {
    if (subtitles.length === 0) {
      onAddNotification("No subtitles loaded in project", "error");
      return;
    }

    const styled = applyGradientsToSubtitles(
      subtitles, 
      p.id, 
      p.gradientMode || config.gradientMode, 
      config.targetStreams,
      {
        customColors: p.colors,
        boldEmphasis: config.boldEmphasis,
        italicize: config.italicize,
        uppercaseOriginal: config.transformCase === 'uppercase'
      }
    );

    onApply(styled);
    if (onUpdateActiveStyling) {
      onUpdateActiveStyling({
        ...config,
        paletteId: p.id,
        customColors: [...p.colors],
        gradientMode: p.gradientMode || config.gradientMode
      });
    }

    onAddLog(`Applied saved library palette "${p.name}" (${p.colors.length} colors) to ${subtitles.length} subtitles.`, 'success');
    onAddNotification(`Applied "${p.name}" to project subtitles!`, "success");
    onClose();
  };

  const handleDeleteSavedPalette = (id: string, name: string) => {
    setSavedPalettes(prev => prev.filter(p => p.id !== id));
    onAddNotification(`Removed "${name}" from library`, "success");
  };

  const handleSaveRename = (id: string) => {
    if (!editingPaletteName.trim()) return;
    setSavedPalettes(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, name: editingPaletteName.trim() };
      }
      return p;
    }));
    setEditingPaletteId(null);
    setEditingPaletteName('');
    onAddNotification("Palette renamed", "success");
  };

  // Export Library JSON
  const handleExportLibraryJson = () => {
    const jsonStr = JSON.stringify(savedPalettes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitle_gradient_library_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 10000);
    onAddNotification("Exported Gradient Library as JSON file", "success");
    onAddLog(`Exported ${savedPalettes.length} gradient palettes to JSON backup file.`, 'info');
  };

  // Import Library JSON
  const handleImportLibraryJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(item => item && item.name && Array.isArray(item.colors) && item.colors.length > 0);
          if (valid.length === 0) {
            onAddNotification("No valid palettes found in JSON file", "error");
            return;
          }
          setSavedPalettes(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = valid.map((v, i) => ({
              ...v,
              id: existingIds.has(v.id) ? `imported-${Date.now()}-${i}` : (v.id || `imported-${Date.now()}-${i}`),
              createdAt: v.createdAt || Date.now()
            }));
            return [...newItems, ...prev];
          });
          onAddNotification(`Imported ${valid.length} palettes into your library!`, "success");
          onAddLog(`Imported ${valid.length} gradient palettes from ${file.name}.`, 'success');
        } else {
          onAddNotification("Invalid library file format", "error");
        }
      } catch (err) {
        onAddNotification("Failed to parse JSON file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Restore starter favorites
  const handleRestoreStarterFavorites = () => {
    setSavedPalettes(STARTER_LIBRARY_PALETTES);
    onAddNotification("Reset library to starter presets", "success");
  };

  // Filtered library
  const filteredPalettes = useMemo(() => {
    if (!librarySearch.trim()) return savedPalettes;
    const query = librarySearch.toLowerCase();
    return savedPalettes.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
    );
  }, [savedPalettes, librarySearch]);

  const DropdownMenuSection = ({
    id,
    title,
    summary,
    icon: Icon,
    children,
  }: {
    id: keyof typeof openMenus;
    title: string;
    summary?: string;
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
    children: React.ReactNode;
  }) => {
    const expanded = openMenus[id];
    return (
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-elevated)',
          borderColor: expanded ? 'var(--theme-accent)' : 'var(--theme-border)',
        }}
      >
        <button
          type="button"
          onClick={() => toggleMenuSection(id)}
          aria-expanded={expanded}
          className="w-full min-h-[42px] px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer hover:opacity-95"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={14} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold truncate">{title}</div>
              {summary && <div className="text-[9.5px] opacity-60 truncate">{summary}</div>}
            </div>
          </div>
          <ChevronDown
            size={14}
            className={cn('shrink-0 opacity-65 transition-transform duration-150', expanded && 'rotate-180')}
          />
        </button>

        {expanded && (
          <div
            className="p-2.5 border-t space-y-2.5"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
            }}
            data-no-drawer-swipe="true"
          >
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <RightEdgeDrawerShell isOpen={isOpen} onClose={onClose} widthClass="w-[min(94vw,430px)]">
        {/* Drawer Header */}
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Palette size={15} style={{ color: 'var(--theme-accent)' }} />
            <h2 className="font-semibold text-sm truncate">Gradient Studio</h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleApplyToSubtitles}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white font-semibold text-xs cursor-pointer btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Sparkles size={12} />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg opacity-65 hover:opacity-100 cursor-pointer"
              aria-label="Close Gradient Studio"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Drop-Down Menus inside Right-Edge Drawer */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2.5 text-xs">
          {/* Drop-Down 1: Live Cinema Preview */}
          <DropdownMenuSection
            id="preview"
            title="Live Studio Preview"
            summary={config.customColors ? 'Custom Palette' : `${selectedPalette.name} · ${config.gradientMode}`}
            icon={Eye}
          >
            <div className="flex items-center justify-between gap-1.5 flex-wrap text-[10px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={previewStreams.original}
                    onChange={(e) => setPreviewStreams((prev) => ({ ...prev, original: e.target.checked }))}
                    className="rounded w-3 h-3"
                  />
                  <span>Orig</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={previewStreams.ai}
                    onChange={(e) => setPreviewStreams((prev) => ({ ...prev, ai: e.target.checked }))}
                    className="rounded w-3 h-3"
                  />
                  <span>AI</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={previewStreams.google}
                    onChange={(e) => setPreviewStreams((prev) => ({ ...prev, google: e.target.checked }))}
                    className="rounded w-3 h-3"
                  />
                  <span>Neutral</span>
                </label>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {(['cinema-dark', 'city-night', 'sunset', 'cyber', 'studio-light'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setVideoBackdrop(b)}
                    className={cn(
                      'px-1.5 py-0.5 rounded uppercase text-[8.5px] font-semibold cursor-pointer border',
                      videoBackdrop === b ? 'text-white' : 'opacity-65'
                    )}
                    style={
                      videoBackdrop === b
                        ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {b.split('-')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={cn(
                'p-3 rounded-xl border flex flex-col items-center justify-center min-h-[96px] text-center gap-1.5 relative overflow-hidden transition-all',
                videoBackdrop === 'cinema-dark'
                  ? 'bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white border-zinc-800'
                  : videoBackdrop === 'city-night'
                  ? 'bg-gradient-to-b from-blue-950 via-slate-900 to-zinc-950 text-white border-zinc-800'
                  : videoBackdrop === 'sunset'
                  ? 'bg-gradient-to-b from-amber-950/80 via-rose-950/60 to-black text-white border-zinc-800'
                  : videoBackdrop === 'cyber'
                  ? 'bg-gradient-to-b from-fuchsia-950/80 via-purple-950/60 to-black text-white border-zinc-800'
                  : 'bg-gradient-to-b from-zinc-200 via-zinc-100 to-zinc-300 text-zinc-900 border-zinc-300'
              )}
            >
              {styledSampleItems.slice(0, 1).map((sample) => (
                <div key={sample.index} className="space-y-1.5 w-full flex flex-col items-center">
                  {previewStreams.ai && sample.translatedText && (
                    <div
                      className="leading-relaxed drop-shadow-md"
                      style={{
                        fontFamily: activeUrduFont,
                        fontSize: `${Math.min(24, previewFontSize)}px`,
                      }}
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: sample.translatedText }}
                    />
                  )}
                  {previewStreams.original && sample.text && (
                    <div
                      className="opacity-95 font-sans drop-shadow-sm"
                      style={{
                        fontFamily: activeEnglishFont,
                        fontSize: `${Math.max(11, Math.round(previewFontSize * 0.62))}px`,
                      }}
                      dangerouslySetInnerHTML={{ __html: sample.text }}
                    />
                  )}
                  {previewStreams.google && sample.googleTranslateText && (
                    <div
                      className="opacity-85 italic font-urdu drop-shadow-sm"
                      style={{
                        fontFamily: activeUrduFont,
                        fontSize: `${Math.max(11, Math.round(previewFontSize * 0.58))}px`,
                      }}
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: sample.googleTranslateText }}
                    />
                  )}
                </div>
              ))}
            </div>
          </DropdownMenuSection>

          {/* Drop-Down 2: Target Subtitle Streams */}
          <DropdownMenuSection
            id="streams"
            title="Target Subtitle Streams"
            summary={config.targetStreams}
            icon={Layers}
          >
            <select
              value={config.targetStreams}
              onChange={(e) => updateConfig({ targetStreams: e.target.value as TargetStreamField })}
              className="w-full min-h-[36px] py-1.5 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-elevated)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            >
              <option value="all">All 3 Streams (Original + AI + Neutral)</option>
              <option value="both">Both (Original + AI Urdu)</option>
              <option value="translated">AI Translated (Urdu Only)</option>
              <option value="original">Original (Source Language Only)</option>
              <option value="google">Neutral / Google Only</option>
            </select>
          </DropdownMenuSection>

          {/* Drop-Down 3: Gradient Progression Modes */}
          <DropdownMenuSection
            id="modes"
            title={`Progression Modes (${GRADIENT_PROGRESSION_MODES.length})`}
            summary={GRADIENT_PROGRESSION_MODES.find((m) => m.id === config.gradientMode)?.label || config.gradientMode}
            icon={Sliders}
          >
            <div className="grid grid-cols-1 gap-1.5">
              {GRADIENT_PROGRESSION_MODES.map((m) => {
                const isSelected = config.gradientMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateConfig({ gradientMode: m.id })}
                    className={cn(
                      'p-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between gap-2',
                      isSelected && 'ring-1 ring-[var(--theme-accent)]'
                    )}
                    style={{
                      backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[11px] truncate">{m.label}</div>
                      <div className="text-[9.5px] opacity-60 truncate">{m.desc}</div>
                    </div>
                    <span
                      className={cn(
                        'text-[8.5px] font-mono px-1.5 py-0.5 rounded shrink-0',
                        isSelected ? 'text-white' : 'opacity-70 border'
                      )}
                      style={
                        isSelected
                          ? { backgroundColor: 'var(--theme-accent)' }
                          : { borderColor: 'var(--theme-border)' }
                      }
                    >
                      {m.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </DropdownMenuSection>

          {/* Drop-Down 4: Designer Curated Palettes */}
          <DropdownMenuSection
            id="palettes"
            title={`Curated Palettes (${GRADIENT_PALETTES.length})`}
            summary={selectedPalette.name}
            icon={Palette}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {GRADIENT_PALETTES.map((palette) => {
                const isSelected = !config.customColors && config.paletteId === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => {
                      updateConfig({
                        paletteId: palette.id,
                        customColors: undefined,
                      });
                      const syncd = palette.colors.map((c, i) => ({
                        id: `stop-${i}`,
                        color: c,
                        offset: Math.round((i / Math.max(1, palette.colors.length - 1)) * 100),
                      }));
                      setGradientStops(syncd);
                      setActiveStopId(syncd[0]?.id || 'stop-0');
                    }}
                    className={cn(
                      'p-2 rounded-lg border text-left transition-colors flex flex-col gap-1 cursor-pointer',
                      isSelected && 'ring-1 ring-[var(--theme-accent)]'
                    )}
                    style={{
                      backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <div className="h-3 w-full rounded" style={{ background: palette.previewCss }} />
                    <div className="font-semibold text-[10px] truncate">{palette.name}</div>
                    <div className="text-[8.5px] opacity-60 truncate">{palette.colors.length} stops</div>
                  </button>
                );
              })}
            </div>
          </DropdownMenuSection>

          {/* Drop-Down 5: Multi-Step Palette Picker */}
          <DropdownMenuSection
            id="builder"
            title="Multi-Step Palette Picker"
            summary={`${gradientStops.length} Stops · ${config.gradientDirection || '135deg'}`}
            icon={Pipette}
          >
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                {([2, 3, 4, 5] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleApplyStepPreset(count)}
                    className={cn(
                      'px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer',
                      gradientStops.length === count ? 'text-white' : 'opacity-75'
                    )}
                    style={
                      gradientStops.length === count
                        ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {count} Steps
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDistributeStopsEvenly}
                  className="px-2 py-1 rounded-md border text-[9.5px] font-semibold cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  Even
                </button>
                <button
                  type="button"
                  onClick={handleReversePalette}
                  className="px-2 py-1 rounded-md border text-[9.5px] font-semibold flex items-center gap-0.5 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  <ArrowLeftRight size={10} />
                  <span>Flip</span>
                </button>
              </div>
            </div>

            <div className="relative pt-1 pb-7 select-none">
              <div
                onClick={handleTrackClick}
                className="h-8 w-full rounded-lg cursor-crosshair border relative"
                style={{ background: trackGradientCss, borderColor: 'var(--theme-border)' }}
                title="Tap track to add color stop"
              />
              {sortedStops.map((stop) => {
                const isSelected = stop.id === activeStop.id;
                return (
                  <div
                    key={stop.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveStopId(stop.id);
                    }}
                    className={cn(
                      'absolute bottom-0 -translate-x-1/2 flex flex-col items-center cursor-pointer',
                      isSelected ? 'scale-115 z-20' : 'opacity-85 z-10'
                    )}
                    style={{ left: `${stop.offset}%` }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 shadow"
                      style={{
                        backgroundColor: stop.color,
                        borderColor: isSelected ? 'var(--theme-accent)' : '#ffffff',
                      }}
                    />
                    <span className="text-[8px] font-mono mt-0.5 opacity-75">{stop.offset}%</span>
                  </div>
                );
              })}
            </div>

            <div
              className="p-2 rounded-lg border space-y-2"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-mono font-semibold">{activeStop.color}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDuplicateActiveStop}
                    className="px-2 py-0.5 rounded border text-[9.5px] font-semibold cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    Duplicate
                  </button>
                  {gradientStops.length > 2 && (
                    <button
                      type="button"
                      onClick={handleDeleteActiveStop}
                      className="px-2 py-0.5 rounded border text-[9.5px] font-semibold text-red-500 border-red-500/30 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={activeStop.offset}
                onChange={(e) => handleUpdateActiveStopOffset(Number(e.target.value))}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="flex justify-center py-1">
              <ColorWheelPicker
                color={activeStop.color}
                onChange={(c) => handleUpdateActiveStopColor(c)}
                label={`Stop (${activeStop.offset}%)`}
                showAlpha={false}
                size="double"
                inline={true}
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t" style={{ borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center gap-1">
                {(['45deg', '90deg', '135deg', '180deg'] as const).map((angle) => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => updateConfig({ gradientDirection: angle })}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold border cursor-pointer',
                      (config.gradientDirection || '135deg') === angle ? 'text-white' : 'opacity-70'
                    )}
                    style={
                      (config.gradientDirection || '135deg') === angle
                        ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {angle}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleOpenSaveModal}
                className="px-2.5 py-1 rounded-lg text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                <Bookmark size={11} />
                <span>Save Palette</span>
              </button>
            </div>
          </DropdownMenuSection>

          {/* Drop-Down 6: Solid Colors */}
          <DropdownMenuSection
            id="solid"
            title="Solid Subtitle Colors"
            summary={customSolidColor}
            icon={Sun}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {SOLID_SUBTITLE_COLORS.map((c) => {
                const isSelected =
                  config.customColors?.length === 1 && config.customColors[0].toUpperCase() === c.hex.toUpperCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleSelectSolidColor(c.hex)}
                    className={cn(
                      'p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer',
                      isSelected && 'ring-1 ring-[var(--theme-accent)]'
                    )}
                    style={{
                      backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'var(--theme-elevated)',
                      borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded border border-black/15 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-[10px] truncate">{c.name}</div>
                      <div className="font-mono text-[8.5px] opacity-60">{c.hex}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--theme-border)' }}>
              <ColorWheelPicker
                color={customSolidColor}
                onChange={(c) => {
                  setCustomSolidColor(c);
                  updateConfig({
                    paletteId: 'solid-custom',
                    customColors: [c],
                    gradientMode: 'block-shift',
                  });
                }}
                label="Custom Solid Color"
                showAlpha={false}
                size="double"
                inline={true}
              />
              <button
                type="button"
                onClick={() => handleSelectSolidColor(customSolidColor)}
                className="w-full py-1.5 rounded-lg text-white font-semibold text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                Use Solid {customSolidColor}
              </button>
            </div>
          </DropdownMenuSection>

          {/* Drop-Down 7: Gradient Library */}
          <DropdownMenuSection
            id="library"
            title={`Gradient Library (${savedPalettes.length})`}
            summary="Saved & reusable palettes"
            icon={Bookmark}
          >
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search library..."
                  className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border text-[11px]"
                  style={{
                    backgroundColor: 'var(--theme-elevated)',
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleOpenSaveModal}
                className="min-h-[32px] px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                <Plus size={12} />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={handleExportLibraryJson}
                className="min-h-[32px] px-2 rounded-lg border text-[11px] cursor-pointer shrink-0"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title="Export Library JSON"
              >
                <Download size={13} />
              </button>
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="min-h-[32px] px-2 rounded-lg border text-[11px] cursor-pointer shrink-0"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                title="Import Library JSON"
              >
                <Upload size={13} />
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportLibraryJson}
                className="hidden"
              />
            </div>

            {filteredPalettes.length === 0 ? (
              <div className="p-4 text-center rounded-lg border border-dashed space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
                <p className="text-[11px] opacity-65">No saved palettes match.</p>
                <button
                  type="button"
                  onClick={handleRestoreStarterFavorites}
                  className="px-2.5 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                >
                  Load Starters
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {filteredPalettes.map((palette) => {
                  const isEditing = editingPaletteId === palette.id;
                  return (
                    <div
                      key={palette.id}
                      className="p-2.5 rounded-lg border space-y-2"
                      style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingPaletteName}
                                onChange={(e) => setEditingPaletteName(e.target.value)}
                                className="w-full px-2 py-0.5 rounded border text-xs font-semibold"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(palette.id)}
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                              >
                                <Check size={11} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-[11px] truncate">{palette.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPaletteId(palette.id);
                                  setEditingPaletteName(palette.name);
                                }}
                                className="opacity-55 hover:opacity-100 cursor-pointer"
                                title="Rename"
                              >
                                <Edit2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedPalette(palette.id, palette.name)}
                          className="text-red-500 opacity-75 hover:opacity-100 p-0.5 cursor-pointer"
                          title="Delete saved palette"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div
                        className="h-4 w-full rounded border border-black/10"
                        style={{ background: `linear-gradient(90deg, ${palette.colors.join(', ')})` }}
                      />

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedPalette(palette)}
                          className="flex-1 py-1 px-2 rounded-md border text-[10px] font-semibold cursor-pointer"
                          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplySavedPaletteDirectly(palette)}
                          className="py-1 px-2.5 rounded-md text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          style={{ backgroundColor: 'var(--theme-accent)' }}
                        >
                          <Sparkles size={10} />
                          <span>Apply</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DropdownMenuSection>
        </div>

        {/* Drawer Footer */}
        <div
          className="relative px-3 py-2.5 border-t flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearAllFormatting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium text-red-500 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <RotateCcw size={12} />
              <span>Clear</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <Download size={12} style={{ color: 'var(--theme-accent)' }} />
                <span>Export</span>
                <ChevronUp size={12} className={cn('opacity-60 transition-transform', !isExportMenuOpen && 'rotate-180')} />
              </button>

              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[140]" onClick={() => setIsExportMenuOpen(false)} />
                  <div
                    className="absolute bottom-11 left-0 w-52 border rounded-xl shadow-2xl p-1.5 z-[150] space-y-1 max-h-[55dvh] overflow-y-auto"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  >
                    {[
                      { id: 'srt' as const, label: 'Formatted SRT' },
                      { id: 'ass' as const, label: 'Advanced ASS' },
                      { id: 'ssa' as const, label: 'SSA v4' },
                      { id: 'vtt' as const, label: 'WebVTT (.vtt)' },
                      { id: 'json' as const, label: 'Styled JSON' },
                      { id: 'clean' as const, label: 'Clean Plain SRT' },
                    ].map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => {
                          handleDirectDownload(exp.id);
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-left hover:opacity-100 flex items-center justify-between text-xs font-medium cursor-pointer"
                        style={{ backgroundColor: 'var(--theme-elevated)' }}
                      >
                        <span>{exp.label}</span>
                        <Download size={12} style={{ color: 'var(--theme-accent)' }} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg border font-medium text-xs cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApplyToSubtitles}
              className="px-3 py-1.5 text-white rounded-lg font-semibold text-xs flex items-center gap-1 cursor-pointer btn-inch-cap"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Sparkles size={12} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </RightEdgeDrawerShell>

      {/* SAVE TO GRADIENT LIBRARY MODAL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div
            className="w-full max-w-[calc(100vw-24px)] sm:max-w-md border rounded-xl p-4 shadow-2xl space-y-3"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkPlus size={15} style={{ color: 'var(--theme-accent)' }} />
                <h3 className="font-semibold text-sm">Save Palette</h3>
              </div>
              <button type="button" onClick={() => setIsSaveModalOpen(false)} className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div
              className="h-7 w-full rounded-lg border"
              style={{
                borderColor: 'var(--theme-border)',
                background: `linear-gradient(90deg, ${sortedStops.map((s) => s.color).join(', ')})`,
              }}
            />

            <div className="space-y-2.5">
              <input
                type="text"
                value={savePaletteName}
                onChange={(e) => setSavePaletteName(e.target.value)}
                placeholder="Palette name"
                className="w-full px-3 py-2 rounded-lg border text-xs"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                autoFocus
              />
              <input
                type="text"
                value={savePaletteDesc}
                onChange={(e) => setSavePaletteDesc(e.target.value)}
                placeholder="Optional note"
                className="w-full px-3 py-2 rounded-lg border text-xs"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border font-medium text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveToLibrary}
                className="px-3.5 py-1.5 rounded-lg text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                <Save size={12} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
