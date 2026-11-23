import React, { useState } from 'react';
import { Wand2, X } from 'lucide-react';
import { SubtitleItem } from '../utils/srtParser';
import { executeCleanup, CleanupOptions } from '../utils/subtitleOperations';
import { InfoPopover } from './InfoPopover';

interface TextCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleItem[];
  selectedCount: number;
  selectedIndices: Set<number>;
  onApply: (updated: SubtitleItem[]) => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const TextCleanupModal: React.FC<TextCleanupModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  selectedCount,
  selectedIndices,
  onApply,
  onAddLog,
}) => {
  const [fixUrduPunctuation, setFixUrduPunctuation] = useState(true);
  const [trimSpaces, setTrimSpaces] = useState(true);
  const [stripTags, setStripTags] = useState(false);
  const [removeSoundCues, setRemoveSoundCues] = useState(false);
  const [normalizeNewlines, setNormalizeNewlines] = useState(true);
  const [applyToSelectedOnly, setApplyToSelectedOnly] = useState(false);

  if (!isOpen) return null;

  const handleExecute = () => {
    const options: CleanupOptions = {
      fixUrduPunctuation,
      trimSpaces,
      stripTags,
      removeSoundCues,
      normalizeNewlines,
      selectedIndices: applyToSelectedOnly && selectedCount > 0 ? selectedIndices : undefined,
    };
    const updated = executeCleanup(subtitles, options);
    onApply(updated);
    onAddLog('Batch cleanup executed: punctuation, spaces, and formatting normalized.', 'success');
    onClose();
  };

  const toggles = [
    { label: 'Urdu Punctuation (۔ ، ؟)', checked: fixUrduPunctuation, onChange: setFixUrduPunctuation },
    { label: 'Trim Extra Spaces & Tabs', checked: trimSpaces, onChange: setTrimSpaces },
    { label: 'Normalize Line Breaks', checked: normalizeNewlines, onChange: setNormalizeNewlines },
    { label: 'Remove Audio Cues [music]', checked: removeSoundCues, onChange: setRemoveSoundCues },
    { label: 'Strip Color & HTML Tags', checked: stripTags, onChange: setStripTags },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-24px)] sm:max-w-md w-full max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col text-xs"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2">
            <Wand2 size={15} style={{ color: 'var(--theme-accent)' }} />
            <h3 className="font-semibold text-sm">Text Cleanup</h3>
            <InfoPopover
              title="Batch Text Cleanup"
              description="Normalize Urdu punctuation (۔ ، ؟), strip extra spaces, clean multi-line breaks, or remove bracketed sound cues and color tags."
            />
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="p-3.5 space-y-2 overflow-y-auto">
          {toggles.map((item) => (
            <label
              key={item.label}
              className="flex items-center justify-between p-2.5 rounded-lg border cursor-pointer"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <span className="font-medium text-xs">{item.label}</span>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
                className="rounded w-4 h-4 cursor-pointer"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
            </label>
          ))}

          {selectedCount > 0 && (
            <label
              className="flex items-center justify-between p-2.5 rounded-lg border cursor-pointer font-semibold"
              style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
            >
              <span>Selected only ({selectedCount})</span>
              <input
                type="checkbox"
                checked={applyToSelectedOnly}
                onChange={(e) => setApplyToSelectedOnly(e.target.checked)}
                className="rounded w-4 h-4"
                style={{ accentColor: 'var(--theme-accent)' }}
              />
            </label>
          )}
        </div>

        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-end gap-2"
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
            onClick={handleExecute}
            className="px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            <Wand2 size={13} />
            <span>Clean Text</span>
          </button>
        </div>
      </div>
    </div>
  );
};
