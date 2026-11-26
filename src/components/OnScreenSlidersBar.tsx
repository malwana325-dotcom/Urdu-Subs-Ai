import React, { useState } from 'react';
import { ZoomIn, Maximize2, RotateCcw, X, Minus, Plus } from 'lucide-react';
import {
  clampZoom,
  clampContainerPadding,
  containerSizeToPadding,
  paddingToContainerSize,
} from '../services/appPreferences';
import { InfoPopover } from './InfoPopover';
import { cn } from '../utils/cn';

interface OnScreenSlidersBarProps {
  isOpen: boolean;
  onClose: () => void;
  uiZoom: number;
  containerPaddingPx: number;
  onChangeZoom: (zoom: number) => void;
  onChangeContainerPadding: (px: number) => void;
}

export const OnScreenSlidersBar: React.FC<OnScreenSlidersBarProps> = ({
  isOpen,
  onClose,
  uiZoom,
  containerPaddingPx,
  onChangeZoom,
  onChangeContainerPadding,
}) => {
  const [activeSliderTab, setActiveSliderTab] = useState<'zoom' | 'spacing'>('zoom');

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-[64px] lg:bottom-4 right-3 left-3 sm:left-auto sm:w-[340px] max-w-[calc(100vw-24px)] z-[130] rounded-xl border shadow-xl p-2.5 space-y-2.5 mobile-fixed-chrome mc-popup mc-role-style"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text)',
      }}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSliderTab('zoom')}
            className={cn(
              'min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors',
              activeSliderTab === 'zoom' ? 'text-white' : 'opacity-70 hover:opacity-100'
            )}
            style={
              activeSliderTab === 'zoom'
                ? { backgroundColor: 'var(--theme-accent)' }
                : { backgroundColor: 'var(--theme-elevated)' }
            }
          >
            <ZoomIn size={12} />
            <span className="tabular-nums">Zoom {uiZoom}%</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSliderTab('spacing')}
            className={cn(
              'min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors',
              activeSliderTab === 'spacing' ? 'text-white' : 'opacity-70 hover:opacity-100'
            )}
            style={
              activeSliderTab === 'spacing'
                ? { backgroundColor: 'var(--theme-accent)' }
                : { backgroundColor: 'var(--theme-elevated)' }
            }
          >
            <Maximize2 size={12} />
            <span className="tabular-nums">Gap {containerPaddingPx}px</span>
          </button>

          <InfoPopover
            title="UI Zoom & Spacing"
            description="Scale UI text (50%–200%) or card spacing live across all screens."
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg border flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer shrink-0"
          style={{
            backgroundColor: 'var(--theme-elevated)',
            borderColor: 'var(--theme-border)',
          }}
          aria-label="Close sliders"
        >
          <X size={13} />
        </button>
      </div>

      {activeSliderTab === 'zoom' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeZoom(clampZoom(uiZoom - 10))}
              className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              aria-label="Zoom out"
            >
              <Minus size={13} />
            </button>

            <input
              type="range"
              min={50}
              max={200}
              step={5}
              value={uiZoom}
              onChange={(e) => onChangeZoom(clampZoom(Number(e.target.value)))}
              className="flex-1 cursor-pointer h-1.5"
            />

            <button
              type="button"
              onClick={() => onChangeZoom(clampZoom(uiZoom + 10))}
              className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              aria-label="Zoom in"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1">
              {[75, 100, 125, 150].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeZoom(preset)}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] font-mono font-semibold border cursor-pointer tabular-nums',
                    uiZoom === preset ? 'text-white' : ''
                  )}
                  style={
                    uiZoom === preset
                      ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                      : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                  }
                >
                  {preset}%
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onChangeZoom(100)}
              className="px-2 py-1 rounded text-[10px] font-semibold border flex items-center gap-1 cursor-pointer opacity-75 hover:opacity-100"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeContainerPadding(clampContainerPadding(containerPaddingPx - 2))}
              className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              aria-label="Decrease spacing"
            >
              <Minus size={13} />
            </button>

            <input
              type="range"
              min={6}
              max={28}
              step={1}
              value={containerPaddingPx}
              onChange={(e) => onChangeContainerPadding(clampContainerPadding(Number(e.target.value)))}
              className="flex-1 cursor-pointer h-1.5"
            />

            <button
              type="button"
              onClick={() => onChangeContainerPadding(clampContainerPadding(containerPaddingPx + 2))}
              className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              aria-label="Increase spacing"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1">
              {(['compact', 'standard', 'spacious'] as const).map((preset) => {
                const isSelected = paddingToContainerSize(containerPaddingPx) === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChangeContainerPadding(containerSizeToPadding(preset))}
                    className={cn(
                      'px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer capitalize',
                      isSelected ? 'text-white' : ''
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onChangeContainerPadding(16)}
              className="px-2 py-1 rounded text-[10px] font-semibold border flex items-center gap-1 cursor-pointer opacity-75 hover:opacity-100"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
