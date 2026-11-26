import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sun,
  Moon,
  Zap,
  Sparkles,
  Droplets,
  Flame,
  Check,
  Palette,
  ChevronDown,
  Rainbow,
  Sunrise,
} from 'lucide-react';
import { getClampedPopoverStyle } from '../utils/popoverPlacement';
import { useBodyScrollLock } from '../utils/scrollLock';
import { cn } from '../utils/cn';

export type AppTheme =
  | 'aurora'
  | 'prism'
  | 'sunset'
  | 'classic'
  | 'cinematic'
  | 'cyber'
  | 'neon'
  | 'sapphire'
  | 'amber';

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  shortName: string;
  category: 'Vibrant' | 'Light' | 'Dark' | 'Special';
  description: string;
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    bg: string;
    accent: string;
    border: string;
  };
  icon: React.FC<{ size?: number; className?: string }>;
}

export const APP_THEMES: ThemeDefinition[] = [
  {
    id: 'aurora',
    name: 'Vibrant Aurora',
    shortName: 'Aurora',
    category: 'Vibrant',
    description: 'Multicolor cyan, electric violet & coral dark canvas',
    isDark: true,
    colors: {
      primary: '#06b6d4',
      secondary: '#8b5cf6',
      tertiary: '#ec4899',
      bg: '#090b1a',
      accent: '#22d3ee',
      border: 'rgba(139, 92, 246, 0.30)',
    },
    icon: Rainbow,
  },
  {
    id: 'prism',
    name: 'Vibrant Prism',
    shortName: 'Prism',
    category: 'Vibrant',
    description: 'Bright sunlit multicolor sky, emerald & warm coral',
    isDark: false,
    colors: {
      primary: '#0284c7',
      secondary: '#10b981',
      tertiary: '#f97316',
      bg: '#f8fafc',
      accent: '#0ea5e9',
      border: '#cbd5e1',
    },
    icon: Sparkles,
  },
  {
    id: 'sunset',
    name: 'Sunset Fiesta',
    shortName: 'Sunset',
    category: 'Vibrant',
    description: 'Vibrant rose coral, golden amber & ocean teal',
    isDark: true,
    colors: {
      primary: '#f43f5e',
      secondary: '#f59e0b',
      tertiary: '#14b8a6',
      bg: '#130a1a',
      accent: '#fb7185',
      border: 'rgba(244, 63, 94, 0.28)',
    },
    icon: Sunrise,
  },
  {
    id: 'classic',
    name: 'Neutral Studio',
    shortName: 'Light',
    category: 'Light',
    description: 'Crisp studio white with teal, sky & indigo accents',
    isDark: false,
    colors: {
      primary: '#0d9488',
      secondary: '#0284c7',
      tertiary: '#6366f1',
      bg: '#f8fafc',
      accent: '#14b8a6',
      border: '#e2e8f0',
    },
    icon: Sun,
  },
  {
    id: 'cinematic',
    name: 'Obsidian Cinema',
    shortName: 'Obsidian',
    category: 'Dark',
    description: 'Deep obsidian with teal, sapphire & warm gold highlights',
    isDark: true,
    colors: {
      primary: '#14b8a6',
      secondary: '#3b82f6',
      tertiary: '#f59e0b',
      bg: '#090a0d',
      accent: '#2dd4bf',
      border: '#222631',
    },
    icon: Moon,
  },
  {
    id: 'cyber',
    name: 'Cyber Cyan',
    shortName: 'Cyber',
    category: 'Special',
    description: 'Carbon dark with electric cyan, violet & lime',
    isDark: true,
    colors: {
      primary: '#06b6d4',
      secondary: '#a855f7',
      tertiary: '#10b981',
      bg: '#07090e',
      accent: '#22d3ee',
      border: '#164e63',
    },
    icon: Zap,
  },
  {
    id: 'neon',
    name: 'Synthwave Dusk',
    shortName: 'Dusk',
    category: 'Special',
    description: 'Plum dark with neon rose, violet & cyan accents',
    isDark: true,
    colors: {
      primary: '#ec4899',
      secondary: '#8b5cf6',
      tertiary: '#06b6d4',
      bg: '#0c0916',
      accent: '#f472b6',
      border: '#500724',
    },
    icon: Sparkles,
  },
  {
    id: 'sapphire',
    name: 'Midnight Sapphire',
    shortName: 'Sapphire',
    category: 'Dark',
    description: 'Oceanic navy with sky blue, indigo & teal',
    isDark: true,
    colors: {
      primary: '#0ea5e9',
      secondary: '#6366f1',
      tertiary: '#14b8a6',
      bg: '#070e1b',
      accent: '#38bdf8',
      border: '#1e3a5f',
    },
    icon: Droplets,
  },
  {
    id: 'amber',
    name: 'Warm Espresso',
    shortName: 'Amber',
    category: 'Special',
    description: 'Espresso dark with cinema gold, coral & emerald',
    isDark: true,
    colors: {
      primary: '#f59e0b',
      secondary: '#f97316',
      tertiary: '#10b981',
      bg: '#100c08',
      accent: '#fbbf24',
      border: '#451a03',
    },
    icon: Flame,
  },
];

export function isLightAppTheme(theme: AppTheme | string | undefined): boolean {
  return theme === 'classic' || theme === 'prism';
}

export function getThemeCanvasColor(theme: AppTheme | string | undefined): string {
  const found = APP_THEMES.find((t) => t.id === theme);
  return found ? found.colors.bg : '#090b1a';
}

interface ThemeSelectorProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(isOpen);

  const activeTheme = APP_THEMES.find((t) => t.id === currentTheme) || APP_THEMES[0];
  const ActiveIcon = activeTheme.icon;

  const updateMenuPosition = useCallback(() => {
    setMenuStyle(getClampedPopoverStyle(buttonRef.current, 276, 420));
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleReposition = () => {
      if (isOpen) updateMenuPosition();
    };
    if (isOpen) {
      updateMenuPosition();
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-1.5 px-2 min-h-[34px] rounded-lg border transition-colors cursor-pointer select-none touch-tactile',
          isOpen && 'ring-1 ring-[var(--theme-accent)]'
        )}
        style={{
          backgroundColor: isOpen ? 'var(--theme-elevated)' : 'var(--theme-surface)',
          borderColor: isOpen ? 'var(--theme-accent)' : 'var(--theme-border)',
          color: 'var(--theme-text)',
        }}
        title={`Theme: ${activeTheme.name}`}
        aria-label={`Theme: ${activeTheme.name}`}
      >
        <span
          className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0"
          style={{
            background: `linear-gradient(135deg, ${activeTheme.colors.primary}, ${activeTheme.colors.secondary}, ${activeTheme.colors.tertiary})`,
          }}
        >
          <ActiveIcon size={10} className="stroke-[2.5]" />
        </span>
        <span className="text-[11px] font-semibold hidden sm:inline">
          {activeTheme.shortName}
        </span>
        <ChevronDown
          size={11}
          className={cn('opacity-55 transition-transform duration-150', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[135] bg-black/20 backdrop-blur-[1px] backdrop-touch-lock"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            aria-hidden="true"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...menuStyle,
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
            className="rounded-xl border shadow-xl p-1.5 z-[140] overflow-y-auto space-y-1 mobile-fixed-chrome overscroll-contain mc-dropdown"
          >
            <div
              className="px-2 py-1 flex items-center justify-between border-b mc-dropdown-header"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 flex items-center gap-1.5 mc-dropdown-title">
                <Palette size={12} style={{ color: 'var(--theme-accent)' }} />
                <span>Vibrant Themes</span>
              </span>
              <span className="text-[10px] font-mono opacity-55 tabular-nums">
                {APP_THEMES.length}
              </span>
            </div>

            <div className="space-y-0.5">
              {APP_THEMES.map((theme) => {
                const isSelected = theme.id === currentTheme;
                const Icon = theme.icon;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      onThemeChange(theme.id);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2"
                    style={{
                      backgroundColor: isSelected ? 'var(--theme-accent-soft)' : 'transparent',
                      borderColor: isSelected ? 'var(--theme-accent)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.tertiary})`,
                        }}
                      >
                        <Icon size={12} className="stroke-[2.5]" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold truncate block">{theme.name}</span>
                        <span className="text-[10px] opacity-55 truncate block">{theme.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center -space-x-1">
                        <span
                          className="w-3 h-3 rounded-full border border-black/15 dark:border-white/25"
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/15 dark:border-white/25"
                          style={{ backgroundColor: theme.colors.secondary }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/15 dark:border-white/25"
                          style={{ backgroundColor: theme.colors.tertiary }}
                        />
                      </div>
                      {isSelected && <Check size={13} style={{ color: 'var(--theme-accent)' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
