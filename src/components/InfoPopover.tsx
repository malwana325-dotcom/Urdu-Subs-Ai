import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { getClampedPopoverStyle } from '../utils/popoverPlacement';
import { useBodyScrollLock } from '../utils/scrollLock';
import { registerBackHandler } from '../utils/backNavigation';
import { cn } from '../utils/cn';

interface InfoPopoverProps {
  title: string;
  description: string;
  details?: string[];
  shortcut?: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export const InfoPopover: React.FC<InfoPopoverProps> = ({
  title,
  description,
  details,
  shortcut,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      setIsOpen(false);
      return true;
    });
  }, [isOpen]);

  const computePosition = useCallback(() => {
    setPopoverStyle(getClampedPopoverStyle(triggerRef.current, 268, 320));
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleReposition = () => {
      if (isOpen) computePosition();
    };
    if (isOpen) {
      computePosition();
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
      window.addEventListener('scroll', handleReposition, true);
      window.addEventListener('resize', handleReposition);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, computePosition]);

  return (
    <div ref={popoverRef} className={cn('relative inline-flex items-center info-popover-trigger', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="w-6 h-6 rounded-md flex items-center justify-center opacity-55 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity cursor-pointer"
        title={`Info: ${title}`}
        aria-label={`Info: ${title}`}
      >
        <HelpCircle size={13} className="shrink-0" style={{ color: 'var(--theme-accent)' }} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[145] bg-black/20 backdrop-blur-[1px] backdrop-touch-lock"
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
              ...popoverStyle,
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
            className="p-2.5 rounded-xl border shadow-xl text-left text-xs z-[150] overflow-y-auto mobile-fixed-chrome overscroll-contain mc-popup mc-role-info"
          >
          <div
            className="flex items-center justify-between pb-1.5 border-b mb-1.5 px-1.5 pt-1 -mx-1 -mt-1 rounded-t-lg mc-popup-header"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <span className="font-semibold text-[11px] truncate pr-2 mc-popup-title">{title}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer shrink-0"
              aria-label="Close info"
            >
              <X size={12} />
            </button>
          </div>

          <p className="text-[11px] opacity-80 leading-relaxed">{description}</p>

          {details && details.length > 0 && (
            <ul
              className="mt-1.5 space-y-1 pt-1.5 border-t text-[10px] opacity-75 list-disc list-inside"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              {details.map((d, i) => (
                <li key={i} className="leading-snug">{d}</li>
              ))}
            </ul>
          )}

          {shortcut && (
            <div
              className="mt-1.5 pt-1.5 border-t flex justify-end"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              <span
                className="font-mono text-[9.5px] px-1.5 py-0.5 rounded border opacity-75"
                style={{ backgroundColor: 'var(--theme-elevated)', borderColor: 'var(--theme-border)' }}
              >
                {shortcut}
              </span>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
};
