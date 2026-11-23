import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useBodyScrollLock } from '../utils/scrollLock';

interface RightEdgeDrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
}

export const RightEdgeDrawerShell: React.FC<RightEdgeDrawerShellProps> = ({
  isOpen,
  onClose,
  widthClass = 'w-[min(92vw,375px)]',
  children,
}) => {
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const swipeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lockedHorizontal: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    lockedHorizontal: false,
  });

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest('input, textarea, select, [data-no-drawer-swipe="true"]')
    ) {
      swipeRef.current.active = false;
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    swipeRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      lockedHorizontal: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!swipeRef.current.active) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - swipeRef.current.startX;
    const dy = touch.clientY - swipeRef.current.startY;

    if (!swipeRef.current.lockedHorizontal) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        swipeRef.current.active = false;
        setDragOffsetX(0);
        return;
      }
      if (dx > 12 && dx > Math.abs(dy) * 1.2) {
        swipeRef.current.lockedHorizontal = true;
      } else {
        return;
      }
    }

    if (dx > 0) {
      setDragOffsetX(dx);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeRef.current.active) {
      setDragOffsetX(0);
      return;
    }
    const shouldClose = dragOffsetX > 56;
    swipeRef.current.active = false;
    swipeRef.current.lockedHorizontal = false;
    setDragOffsetX(0);
    if (shouldClose) {
      onClose();
    }
  };

  useBodyScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[140] flex justify-end backdrop-touch-lock"
          onTouchMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px] backdrop-touch-lock"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
            onWheel={(e) => e.stopPropagation()}
            aria-hidden="true"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: dragOffsetX }}
            exit={{ x: '100%' }}
            transition={
              dragOffsetX > 0
                ? { duration: 0 }
                : { duration: 0.22, ease: [0.2, 0, 0, 1] }
            }
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className={`relative z-10 h-[100dvh] ${widthClass} border-l shadow-2xl flex flex-col pt-safe pb-safe will-change-transform`}
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
          >
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
