import { useEffect } from 'react';

let activeLocks = 0;

function applyScrollLockState() {
  if (typeof document === 'undefined') return;
  if (activeLocks > 0) {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } else {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.documentElement.style.touchAction = '';
    document.body.style.touchAction = '';
  }
}

/**
 * Reference-counted body/html scroll lock.
 * Prevents nested or concurrent overlays from permanently sticking overflow='hidden'
 * when one closes while another is closing/unmounting.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) {
      applyScrollLockState();
      return;
    }
    activeLocks += 1;
    applyScrollLockState();
    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      applyScrollLockState();
    };
  }, [locked]);
}

export function forceClearScrollLock(): void {
  activeLocks = 0;
  applyScrollLockState();
}
