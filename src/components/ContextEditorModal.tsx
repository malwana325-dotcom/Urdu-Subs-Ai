import React, { useState } from 'react';
import { X, Check, Search, MessageSquare, RotateCcw } from 'lucide-react';

interface ContextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  icon?: 'context' | 'prompt';
  onRestoreDefault?: () => void;
}

export const ContextEditorModal: React.FC<ContextEditorModalProps> = ({
  isOpen,
  onClose,
  title,
  value,
  onSave,
  placeholder,
  icon = 'context',
  onRestoreDefault,
}) => {
  const [localVal, setLocalVal] = useState(value);

  React.useEffect(() => {
    if (isOpen) setLocalVal(value);
  }, [isOpen, value]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-black/58 backdrop-touch-lock">
      <div
        className="border rounded-xl shadow-2xl max-w-[calc(100vw-24px)] sm:max-w-2xl w-full max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col text-xs anim-pop-in"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon === 'prompt' ? (
              <MessageSquare size={15} style={{ color: 'var(--theme-accent)' }} />
            ) : (
              <Search size={15} style={{ color: 'var(--theme-accent)' }} />
            )}
            <h3 className="font-semibold text-sm truncate">{title}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onRestoreDefault && (
              <button
                type="button"
                onClick={() => {
                  onRestoreDefault();
                  setLocalVal('Translate naturally for a family drama setting.');
                }}
                className="px-2 py-1 text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--theme-accent)' }}
              >
                <RotateCcw size={11} />
                <span>Default</span>
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-3.5 flex-1 overflow-y-auto">
          <textarea
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            rows={10}
            className="w-full p-3 border rounded-lg focus:outline-none resize-y leading-relaxed text-sm font-sans"
            style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
            placeholder={placeholder}
            autoFocus
          />
        </div>

        <div
          className="px-3.5 py-2.5 border-t flex items-center justify-between"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <span className="text-[10.5px] opacity-65 font-mono tabular-nums">{localVal.length} chars</span>
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
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              <Check size={13} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
