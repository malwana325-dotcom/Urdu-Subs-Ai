import type React from 'react';

/**
 * Computes fixed viewport-clamped CSS coordinates for dropdowns, menus, and popovers
 * so they never clip outside parent scroll/overflow containers or cross viewport edges.
 */
export function getClampedPopoverStyle(
  triggerEl: HTMLElement | { left: number; top: number } | null,
  preferredWidth: number,
  preferredMaxHeight = 420
): React.CSSProperties {
  if (typeof window === 'undefined') {
    return {
      position: 'fixed',
      top: '64px',
      left: '12px',
      width: `${preferredWidth}px`,
      maxHeight: `${preferredMaxHeight}px`,
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;
  const width = Math.min(preferredWidth, Math.max(220, vw - margin * 2));

  if (!triggerEl) {
    return {
      position: 'fixed',
      top: '64px',
      left: `${Math.max(margin, Math.round((vw - width) / 2))}px`,
      width: `${Math.round(width)}px`,
      maxHeight: `${Math.max(200, Math.min(preferredMaxHeight, vh - 88))}px`,
    };
  }

  const rect =
    'getBoundingClientRect' in triggerEl
      ? triggerEl.getBoundingClientRect()
      : { left: triggerEl.left, right: triggerEl.left, top: triggerEl.top, bottom: triggerEl.top };
  let left = rect.right - width;
  if (left < margin) {
    left = rect.left;
  }
  if (left + width > vw - margin) {
    left = vw - width - margin;
  }
  left = Math.max(margin, left);

  const spaceBelow = vh - rect.bottom - margin - 6;
  const spaceAbove = rect.top - margin - 6;

  if (spaceBelow < 220 && spaceAbove > spaceBelow) {
    const maxH = Math.max(180, Math.min(preferredMaxHeight, spaceAbove));
    return {
      position: 'fixed',
      bottom: `${Math.max(margin, Math.round(vh - rect.top + 6))}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(width)}px`,
      maxHeight: `${Math.round(maxH)}px`,
    };
  }

  const top = Math.max(margin, Math.min(rect.bottom + 6, vh - 200));
  const maxH = Math.max(180, Math.min(preferredMaxHeight, vh - top - margin));
  return {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxH)}px`,
  };
}
