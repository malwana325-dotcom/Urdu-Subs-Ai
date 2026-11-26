import React, { useState, useEffect } from 'react';
import { Stamp, X, Check, Sparkles, FileText, Globe } from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import { cn } from '../utils/cn';
import { InfoPopover } from './InfoPopover';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  onApplyWatermark: (updatedSubtitles: SubtitleItem[]) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

const WATERMARK_PRESETS = [
  {
    label: 'Channel Credit',
    source: 'Subtitles & Translation • All Rights Reserved',
    urdu: 'ترجمہ و سب ٹائٹلز • جملہ حقوق محفوظ ہیں',
  },
  {
    label: 'Bilingual Credit',
    source: 'Official Urdu Subtitles',
    urdu: 'آفیشل اردو سب ٹائٹلز',
  },
  {
    label: 'Minimalist Credit',
    source: '[Localized Subtitles]',
    urdu: '[اردو سب ٹائٹلز]',
  },
];

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  onApplyWatermark,
  onAddLog,
}) => {
  const firstBlock = subtitles.length > 0 ? subtitles[0] : null;
  const [sourceWatermark, setSourceWatermark] = useState(firstBlock?.text || 'Subtitles & Translation');
  const [urduWatermark, setUrduWatermark] = useState(firstBlock?.translatedText || 'ترجمہ و سب ٹائٹلز');
  const [googleWatermark, setGoogleWatermark] = useState(firstBlock?.googleTranslateText || 'ترجمہ: گوگل ٹرانسلیٹ');
  const [actionType, setActionType] = useState<'update_first' | 'insert_new'>('update_first');

  useEffect(() => {
    if (isOpen) {
      const currentFirst = subtitles.length > 0 ? subtitles[0] : null;
      setSourceWatermark(currentFirst?.text || 'Subtitles & Translation');
      setUrduWatermark(currentFirst?.translatedText || 'ترجمہ و سب ٹائٹلز');
      setGoogleWatermark(currentFirst?.googleTranslateText || 'ترجمہ: گوگل ٹرانسلیٹ');
    }
  }, [isOpen, subtitles]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (subtitles.length === 0) {
      onApplyWatermark([
        {
          index: 1,
          startTime: '00:00:00,000',
          endTime: '00:00:03,500',
          text: sourceWatermark.trim(),
          translatedText: urduWatermark.trim(),
          googleTranslateText: googleWatermark.trim(),
        },
      ]);
      onAddLog('Created block #1 with watermark credits.', 'success');
      onClose();
      return;
    }

    if (actionType === 'update_first') {
      const updated = subtitles.map((s, idx) =>
        idx === 0
          ? {
              ...s,
              text: sourceWatermark.trim(),
              translatedText: urduWatermark.trim(),
              googleTranslateText: googleWatermark.trim(),
            }
          : s
      );
      onApplyWatermark(updated);
      onAddLog('Updated Row 1 with watermark credits.', 'success');
    } else {
      const newBlock: SubtitleItem = {
        index: 1,
        startTime: '00:00:00,000',
        endTime: '00:00:03,000',
        text: sourceWatermark.trim(),
        translatedText: urduWatermark.trim(),
        googleTranslateText: googleWatermark.trim(),
      };
      const shifted = subtitles.map((s, idx) => ({ ...s, index: idx + 2 }));
      onApplyWatermark([newBlock, ...shifted]);
      onAddLog('Inserted watermark block #1.', 'success');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-3 bg-black/58 backdrop-touch-lock">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-24px)] sm:max-w-lg w-full max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col text-xs anim-pop-in mc-popup mc-role-style"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 mc-popup-header"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2">
            <Stamp size={15} style={{ color: 'var(--theme-accent)' }} className="mc-popup-title" />
            <h3 className="font-semibold text-sm mc-popup-title">Row 1 Watermark</h3>
            <InfoPopover
              title="Block #1 Watermark"
              description="Update Row 1 or prepend a new 3-second intro block with your credit line across Original, AI, and Google columns."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="p-3.5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-1 gap-1.5">
            {WATERMARK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSourceWatermark(preset.source);
                  setUrduWatermark(preset.urdu);
                  setGoogleWatermark(preset.urdu);
                }}
                className="text-left p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer hover:opacity-100"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold">{preset.label}</div>
                  <div className="text-[10px] opacity-65 truncate">{preset.source}</div>
                </div>
                <Sparkles size={12} style={{ color: 'var(--theme-accent)' }} className="shrink-0" />
              </button>
            ))}
          </div>

          {subtitles.length > 0 && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg border" style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}>
              <span className="text-[11px] font-semibold">Target</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActionType('update_first')}
                  className={cn('px-2.5 py-1 rounded-md text-[10.5px] font-semibold cursor-pointer', actionType === 'update_first' ? 'text-white' : 'opacity-70')}
                  style={actionType === 'update_first' ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                >
                  Update Row 1
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('insert_new')}
                  className={cn('px-2.5 py-1 rounded-md text-[10.5px] font-semibold cursor-pointer', actionType === 'insert_new' ? 'text-white' : 'opacity-70')}
                  style={actionType === 'insert_new' ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                >
                  Insert New #1
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="font-semibold text-[11px] flex items-center gap-1">
                <FileText size={11} className="opacity-65" />
                <span>Original</span>
              </label>
              <input
                type="text"
                value={sourceWatermark}
                onChange={(e) => setSourceWatermark(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg text-xs"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[11px] flex items-center gap-1">
                <Globe size={11} style={{ color: 'var(--theme-accent)' }} />
                <span>AI Translation</span>
              </label>
              <input
                type="text"
                value={urduWatermark}
                onChange={(e) => setUrduWatermark(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg text-xs font-urdu text-right"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                dir="rtl"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[11px] flex items-center gap-1">
                <Globe size={11} className="text-blue-500" />
                <span>Google (Optional)</span>
              </label>
              <input
                type="text"
                value={googleWatermark}
                onChange={(e) => setGoogleWatermark(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg text-xs font-urdu text-right"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                dir="rtl"
              />
            </div>
          </div>
        </div>

        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-end gap-2 shrink-0 mc-popup-footer"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
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
            onClick={handleApply}
            className="px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            <Check size={13} />
            <span>Apply Watermark</span>
          </button>
        </div>
      </div>
    </div>
  );
};
