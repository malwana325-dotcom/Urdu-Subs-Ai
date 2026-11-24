import React from 'react';
import { cn } from '../utils/cn';

interface GlowingProgressButtonProps {
  onClick: () => void;
  disabled?: boolean;
  progress?: number; // 0 to 100
  isActive?: boolean;
  variant?: 'ai' | 'neutral' | 'danger';
  title?: string;
  ariaLabel?: string;
  icon: React.ReactNode;
  label: string;
  className?: string;
}

export const GlowingProgressButton: React.FC<GlowingProgressButtonProps> = ({
  onClick,
  disabled = false,
  progress = 0,
  isActive = false,
  variant = 'ai',
  title,
  ariaLabel,
  icon,
  label,
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));

  const glowColor =
    variant === 'danger'
      ? '#ef4444'
      : variant === 'neutral'
      ? '#38bdf8'
      : 'var(--theme-accent, #14b8a6)';

  const ringStrokeWidth = clamped > 0 || isActive ? 2.75 : 1.75;
  const effectivePercent = isActive && clamped < 8 ? 14 : clamped;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || label}
      className={cn(
        'relative group w-[132px] sm:w-[152px] h-[52px] shrink-0 rounded-2xl px-3.5 flex items-center justify-center gap-2 text-xs font-semibold tracking-tight transition-transform duration-150 cursor-pointer touch-tactile disabled:opacity-45 disabled:cursor-not-allowed select-none',
        isActive && 'glow-btn-active-pulse',
        className
      )}
      style={{
        backgroundColor: '#0c0e14',
        color: variant === 'danger' ? '#fecaca' : '#f8fafc',
        boxShadow:
          clamped > 0 || isActive
            ? `0 8px 22px -6px rgba(0, 0, 0, 0.72), 0 0 14px -4px ${glowColor}`
            : '0 8px 20px -6px rgba(0, 0, 0, 0.65)',
      }}
    >
      {/* Subtle obsidian inner sheen */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[2px] rounded-[14px]"
        style={{
          background:
            variant === 'danger'
              ? 'linear-gradient(180deg, rgba(127,29,29,0.42) 0%, rgba(17,12,16,0.92) 100%)'
              : variant === 'neutral'
              ? 'linear-gradient(180deg, rgba(14,116,144,0.22) 0%, rgba(12,14,20,0.96) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(12,14,20,0.96) 100%)',
        }}
      />

      {/* Glowing Perimeter Progress Line Wrapping Around Button */}
      <svg
        aria-hidden="true"
        viewBox="0 0 152 52"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
      >
        {/* Base dark track around perimeter */}
        <rect
          x="1.5"
          y="1.5"
          width="149"
          height="49"
          rx="15"
          ry="15"
          fill="none"
          stroke={variant === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.14)'}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Glowing progress line wrapping around perimeter */}
        {effectivePercent > 0 && (
          <rect
            x="1.5"
            y="1.5"
            width="149"
            height="49"
            rx="15"
            ry="15"
            fill="none"
            stroke={glowColor}
            strokeWidth={ringStrokeWidth}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - effectivePercent}
            vectorEffect="non-scaling-stroke"
            style={{
              filter: `drop-shadow(0 0 4px ${glowColor}) drop-shadow(0 0 9px ${glowColor})`,
              transition: 'stroke-dashoffset 260ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        )}
      </svg>

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2 min-w-0 tabular-nums">
        <span className="shrink-0 flex items-center justify-center" style={{ color: glowColor }}>
          {icon}
        </span>
        <span className="truncate font-semibold">{label}</span>
      </span>
    </button>
  );
};
