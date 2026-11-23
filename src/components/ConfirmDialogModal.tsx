import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useBodyScrollLock } from '../utils/scrollLock';
import { cn } from '../utils/cn';

interface ConfirmDialogModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  danger = true,
  onConfirm,
  onCancel,
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[260] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4 backdrop-touch-lock"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[min(380px,calc(100vw-32px))] rounded-2xl border shadow-2xl overflow-hidden text-xs"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)',
        }}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between gap-2"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle
              size={16}
              className={cn('shrink-0', danger ? 'text-red-500' : 'text-amber-500')}
            />
            <h3 id="confirm-dialog-title" className="text-xs sm:text-sm font-semibold truncate">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-65 hover:opacity-100 cursor-pointer shrink-0"
            aria-label="Close confirmation"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3.5 text-xs leading-relaxed opacity-85 whitespace-pre-line">
          {message}
        </div>

        <div
          className="px-4 py-2.5 border-t flex items-center justify-end gap-2"
          style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[36px] px-4 rounded-xl border text-xs font-semibold cursor-pointer touch-tactile btn-inch-cap"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'min-h-[36px] px-4 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-tactile btn-inch-cap',
              danger && 'bg-red-600 hover:bg-red-700'
            )}
            style={danger ? undefined : { backgroundColor: 'var(--theme-accent)' }}
          >
            <Check size={13} className="shrink-0" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
