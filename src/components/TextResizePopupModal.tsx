import React from 'react';
import { Type as TypeIcon, X, Check, Minus, Plus, RotateCcw } from 'lucide-react';
import { InfoPopover } from './InfoPopover';
import { useBodyScrollLock } from '../utils/scrollLock';

interface TextResizePopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onResetDraft: () => void;
  isDirty: boolean;
  draftOriginalFontSize: number;
  draftTranslatedFontSize: number;
  draftGoogleFontSize: number;
  draftGlobalFontSize: number;
  onChangeOriginalFontSize: (val: number) => void;
  onChangeTranslatedFontSize: (val: number) => void;
  onChangeGoogleFontSize: (val: number) => void;
  onChangeGlobalFontSize: (val: number) => void;
  onSyncAllSizes: (val: number) => void;
  previewDisplayMode: 'rendered' | 'plain';
  onTogglePreviewDisplayMode: () => void;
  activeOriginalFont: string;
  activeAiFont: string;
  activeGoogleFont: string;
  previewSource: { plain: string; html: string; hasHtmlFormatting: boolean };
  previewAi: { plain: string; html: string; hasHtmlFormatting: boolean };
  previewGoogle: { plain: string; html: string; hasHtmlFormatting: boolean };
}

export const TextResizePopupModal: React.FC<TextResizePopupModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onResetDraft,
  isDirty,
  draftOriginalFontSize,
  draftTranslatedFontSize,
  draftGoogleFontSize,
  draftGlobalFontSize,
  onChangeOriginalFontSize,
  onChangeTranslatedFontSize,
  onChangeGoogleFontSize,
  onSyncAllSizes,
  previewDisplayMode,
  onTogglePreviewDisplayMode,
  activeOriginalFont,
  activeAiFont,
  activeGoogleFont,
  previewSource,
  previewAi,
  previewGoogle,
}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const streamRows = [
    {
      label: 'Original',
      val: draftOriginalFontSize,
      min: 10,
      max: 28,
      set: onChangeOriginalFontSize,
    },
    {
      label: 'AI Translation',
      val: draftTranslatedFontSize,
      min: 10,
      max: 32,
      set: onChangeTranslatedFontSize,
    },
    {
      label: 'Google',
      val: draftGoogleFontSize,
      min: 10,
      max: 28,
      set: onChangeGoogleFontSize,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-3 backdrop-touch-lock"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border rounded-xl shadow-2xl w-full max-w-[min(420px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden text-xs overscroll-contain"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)',
        }}
      >
        {/* Clean Header */}
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <TypeIcon size={15} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
            <h3 className="font-semibold text-xs truncate">Text Size</h3>
            {isDirty && (
              <span className="text-[10px] font-semibold text-amber-500">· Draft</span>
            )}
            <InfoPopover
              title="Workspace Text Resize"
              description="Adjust individual stream sizes or sync all subtitle streams together, then tap Apply."
              align="left"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Close text size menu"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0">
          {/* Clean Live Preview Strip */}
          <div
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold opacity-65">Live Preview</span>
              <button
                type="button"
                onClick={onTogglePreviewDisplayMode}
                className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                {previewDisplayMode === 'rendered' ? 'Styled' : 'Plain'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <span className="text-[10px] font-mono opacity-55 shrink-0 tabular-nums">
                  Src · {draftOriginalFontSize}px
                </span>
                <span
                  className="truncate text-right"
                  style={{ fontFamily: activeOriginalFont, fontSize: `${Math.min(draftOriginalFontSize, 18)}px` }}
                >
                  {previewDisplayMode === 'rendered' && previewSource.hasHtmlFormatting ? (
                    <span dangerouslySetInnerHTML={{ __html: previewSource.html }} />
                  ) : (
                    previewSource.plain
                  )}
                </span>
              </div>

              <div
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <span className="text-[10px] font-mono opacity-55 shrink-0 tabular-nums">
                  AI · {draftTranslatedFontSize}px
                </span>
                <span
                  dir="rtl"
                  className="font-urdu truncate"
                  style={{ fontFamily: activeAiFont, fontSize: `${Math.min(draftTranslatedFontSize, 18)}px` }}
                >
                  {previewDisplayMode === 'rendered' && previewAi.hasHtmlFormatting ? (
                    <span dangerouslySetInnerHTML={{ __html: previewAi.html }} />
                  ) : (
                    previewAi.plain
                  )}
                </span>
              </div>

              <div
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <span className="text-[10px] font-mono opacity-55 shrink-0 tabular-nums">
                  G · {draftGoogleFontSize}px
                </span>
                <span
                  dir="rtl"
                  className="font-urdu truncate"
                  style={{ fontFamily: activeGoogleFont, fontSize: `${Math.min(draftGoogleFontSize, 18)}px` }}
                >
                  {previewDisplayMode === 'rendered' && previewGoogle.hasHtmlFormatting ? (
                    <span dangerouslySetInnerHTML={{ __html: previewGoogle.html }} />
                  ) : (
                    previewGoogle.plain
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Presets + Sync All */}
          <div
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">Sync All Streams</span>
              <span className="font-mono text-[11px] font-semibold tabular-nums">
                {draftGlobalFontSize}px
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={28}
              step={1}
              value={draftGlobalFontSize}
              onChange={(e) => onSyncAllSizes(Number(e.target.value))}
              className="w-full h-1.5 cursor-pointer"
            />
            <div className="grid grid-cols-5 gap-1.5 pt-0.5">
              {[11, 13, 15, 18, 22].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onSyncAllSizes(val)}
                  className="min-h-[30px] rounded-md border font-mono text-[10.5px] font-semibold cursor-pointer tabular-nums"
                  style={{
                    backgroundColor:
                      draftGlobalFontSize === val ? 'var(--theme-accent)' : 'var(--theme-surface)',
                    borderColor:
                      draftGlobalFontSize === val ? 'var(--theme-accent)' : 'var(--theme-border)',
                    color: draftGlobalFontSize === val ? '#ffffff' : 'var(--theme-text)',
                  }}
                >
                  {val}px
                </button>
              ))}
            </div>
          </div>

          {/* Individual Stream Controls */}
          <div className="space-y-2">
            {streamRows.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border p-2.5 space-y-1.5"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold">{s.label}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => s.set(Math.max(s.min, s.val - 1))}
                      disabled={s.val <= s.min}
                      className="w-7 h-7 rounded-md border flex items-center justify-center disabled:opacity-35 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                      aria-label={`Decrease ${s.label} size`}
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-10 text-center font-mono text-[11px] font-semibold tabular-nums">
                      {s.val}px
                    </span>
                    <button
                      type="button"
                      onClick={() => s.set(Math.min(s.max, s.val + 1))}
                      disabled={s.val >= s.max}
                      className="w-7 h-7 rounded-md border flex items-center justify-center disabled:opacity-35 cursor-pointer"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                      aria-label={`Increase ${s.label} size`}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={1}
                  value={s.val}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-full h-1.5 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <button
            type="button"
            onClick={onResetDraft}
            disabled={!isDirty}
            className="min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold opacity-70 hover:opacity-100 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[34px] px-3 rounded-lg border text-[11px] font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="min-h-[34px] px-3.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Check size={12} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
