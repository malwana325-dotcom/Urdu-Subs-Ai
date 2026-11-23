import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  X,
  Check,
  Trash2,
  Download,
  Eye,
  Type,
  FileCode,
} from 'lucide-react';
import {
  GRADIENT_PALETTES,
  GradientMode,
  applyGradientsToSubtitles,
  removeAllGradientsFromSubtitles,
  generateFormattedSRT,
  generateASS,
  generateWebVTT,
  generateCleanSRT,
  hasFormatting,
} from '../utils/subtitleFormatter';
import { SubtitleItem } from '../utils/srtParser';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface SubtitleStylizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  onApply: (styledSubtitles: SubtitleItem[]) => void;
  urduFont: string;
  translatedFontSize: number;
  fileName: string;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SubtitleStylizerModal: React.FC<SubtitleStylizerModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  onApply,
  urduFont,
  translatedFontSize,
  fileName,
  onAddLog,
}) => {
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('sunset');
  const [gradientMode, setGradientMode] = useState<GradientMode>('block-shift');
  const [targetField, setTargetField] = useState<'translated' | 'original' | 'both'>('translated');
  const [previewTab, setPreviewTab] = useState<'visual' | 'code'>('visual');

  if (!isOpen) return null;

  const selectedPalette = GRADIENT_PALETTES.find((p) => p.id === selectedPaletteId) || GRADIENT_PALETTES[0];
  const sampleItems: SubtitleItem[] =
    subtitles.slice(0, 3).length > 0
      ? subtitles.slice(0, 3)
      : [
          { index: 1, startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Welcome to this cinematic universe', translatedText: 'اس سنیما کی دنیا میں خوش آمدید' },
          { index: 2, startTime: '00:00:04,500', endTime: '00:00:08,200', text: 'Every dialogue carries deep emotion', translatedText: 'ہر بات میں ایک گہرا احساس چھپا ہے' },
        ];

  const styledSampleItems = applyGradientsToSubtitles(sampleItems, selectedPaletteId, gradientMode, targetField);
  const formattedCount = subtitles.filter((s) => hasFormatting(s.translatedText || '') || hasFormatting(s.text)).length;

  const handleApplyToAll = () => {
    if (subtitles.length === 0) return;
    const styled = applyGradientsToSubtitles(subtitles, selectedPaletteId, gradientMode, targetField);
    onApply(styled);
    onAddLog(`Applied "${selectedPalette.name}" (${gradientMode}) to ${subtitles.length} subtitles.`, 'success');
    onClose();
  };

  const handleClearAll = () => {
    if (subtitles.length === 0) return;
    onApply(removeAllGradientsFromSubtitles(subtitles));
    onAddLog('Removed formatting from subtitles.', 'info');
    onClose();
  };

  const handleDirectDownload = (format: 'srt-formatted' | 'ass' | 'vtt' | 'srt-clean') => {
    if (subtitles.length === 0) return;
    let itemsToExport = subtitles;
    if (format !== 'srt-clean' && formattedCount === 0) {
      itemsToExport = applyGradientsToSubtitles(subtitles, selectedPaletteId, gradientMode, targetField);
      onApply(itemsToExport);
    }

    const baseName = (fileName || 'subtitles').replace(/\.[^/.]+$/, '').replace(/[^a-z0-9_-]/gi, '_');
    const timestamp = Date.now();
    let content = '';
    let mimeType = 'text/plain;charset=utf-8';
    let fileExt = 'srt';

    if (format === 'srt-formatted') {
      content = generateFormattedSRT(itemsToExport, 'ai');
      mimeType = 'text/srt;charset=utf-8';
      fileExt = 'srt';
    } else if (format === 'ass') {
      content = generateASS(itemsToExport, { fontFamily: urduFont, fontSize: translatedFontSize || 38, title: baseName, palette: selectedPalette });
      mimeType = 'text/x-ssa;charset=utf-8';
      fileExt = 'ass';
    } else if (format === 'vtt') {
      content = generateWebVTT(itemsToExport, 'ai');
      mimeType = 'text/vtt;charset=utf-8';
      fileExt = 'vtt';
    } else {
      content = generateCleanSRT(itemsToExport, 'ai');
      mimeType = 'text/srt;charset=utf-8';
      fileExt = 'clean.srt';
    }

    const blob = new Blob(['\ufeff' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_${format}_${timestamp}.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 20000);
    onAddLog(`Saved stylized .${fileExt}`, 'success');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-20px)] sm:max-w-4xl w-full max-h-[calc(100dvh-20px)] flex flex-col overflow-hidden text-xs"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2">
            <Palette size={15} style={{ color: 'var(--theme-accent)' }} />
            <h2 className="text-sm font-semibold">Quick Gradient Stylizer</h2>
            <InfoPopover
              title="Gradient Stylizer"
              description="Apply designer gradient palettes across SRT, ASS, and VTT subtitles."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-3.5 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {GRADIENT_PALETTES.map((palette) => {
              const isSelected = selectedPaletteId === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => setSelectedPaletteId(palette.id)}
                  className="p-2.5 rounded-lg border text-left flex flex-col gap-1.5 relative cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-surface))' : 'var(--theme-elevated)',
                    borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border)',
                  }}
                >
                  <div className="h-3 w-full rounded" style={{ background: palette.previewCss }} />
                  <div className="font-semibold text-[11px] truncate">{palette.name}</div>
                  {isSelected && <Check size={12} className="absolute top-1.5 right-1.5" style={{ color: 'var(--theme-accent)' }} />}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
              <label className="font-semibold text-[11px] block">Progression Mode</label>
              <select
                value={gradientMode}
                onChange={(e) => setGradientMode(e.target.value as GradientMode)}
                className="w-full p-2 border rounded-lg text-xs"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                <option value="block-shift">Block-by-Block Shift</option>
                <option value="word-gradient">Word-by-Word Gradient</option>
                <option value="alternating-speakers">Alternating Speakers</option>
                <option value="ping-pong">Ping-Pong Reversal</option>
                <option value="first-last-accent">Anchor Accent Ends</option>
                <option value="center-out">Center-Out Flare</option>
                <option value="odd-even-words">Odd/Even Stride</option>
                <option value="random-scatter">Chromatic Scatter</option>
                <option value="rainbow-cycle">Spectral Loop</option>
                <option value="tri-color-split">Tri-Color Split</option>
                <option value="syllable-karaoke">Karaoke Step</option>
                <option value="gradient-glow">Radiant Glow</option>
              </select>
            </div>

            <div className="p-3 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
              <label className="font-semibold text-[11px] block">Target Stream</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'translated' as const, label: 'AI' },
                  { id: 'original' as const, label: 'Original' },
                  { id: 'both' as const, label: 'Both' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTargetField(t.id)}
                    className={cn('py-2 rounded-lg border font-semibold text-[11px] cursor-pointer', targetField === t.id ? 'text-white border-transparent' : 'opacity-75')}
                    style={
                      targetField === t.id
                        ? { backgroundColor: 'var(--theme-accent)' }
                        : { backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-black text-white space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold flex items-center gap-1 text-zinc-300">
                <Eye size={12} style={{ color: 'var(--theme-accent)' }} />
                <span>Preview</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewTab('visual')}
                  className={cn('px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer', previewTab === 'visual' ? 'bg-white/20' : 'text-zinc-400')}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('code')}
                  className={cn('px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer', previewTab === 'code' ? 'bg-white/20' : 'text-zinc-400')}
                >
                  SRT
                </button>
              </div>
            </div>

            {previewTab === 'visual' ? (
              <div className="p-4 bg-zinc-950 rounded-lg flex flex-col items-center justify-center min-h-[110px] text-center gap-2">
                {styledSampleItems.map((sample) => (
                  <div
                    key={sample.index}
                    className="leading-relaxed"
                    style={{ fontFamily: urduFont, fontSize: `${Math.max(translatedFontSize, 22)}px` }}
                    dir="rtl"
                    dangerouslySetInnerHTML={{ __html: sample.translatedText || '' }}
                  />
                ))}
              </div>
            ) : (
              <pre className="p-3 bg-zinc-950 font-mono text-[10px] text-emerald-400 overflow-x-auto rounded max-h-32">
                {generateFormattedSRT(styledSampleItems, 'ai')}
              </pre>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleDirectDownload('srt-formatted')}
              className="py-2 px-3 rounded-lg text-white font-semibold flex items-center justify-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Download size={12} />
              <span>SRT</span>
            </button>
            <button
              type="button"
              onClick={() => handleDirectDownload('ass')}
              className="py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <Sparkles size={12} />
              <span>ASS</span>
            </button>
            <button
              type="button"
              onClick={() => handleDirectDownload('vtt')}
              className="py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <FileCode size={12} />
              <span>VTT</span>
            </button>
            <button
              type="button"
              onClick={() => handleDirectDownload('srt-clean')}
              className="py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <Type size={12} />
              <span>Clean SRT</span>
            </button>
          </div>
        </div>

        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-between gap-2 shrink-0"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          {formattedCount > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Clear ({formattedCount})</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyToAll}
              className="px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Sparkles size={12} />
              <span>Apply All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
