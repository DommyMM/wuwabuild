import React from 'react';

interface ErrorBannerProps {
  children: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

/**
 * Inline red error strip with an optional Retry action. Single implementation
 * for the banners that were previously copy-pasted (with drifting paddings and
 * red shades) across the board, breakdown, upgrades and profile surfaces.
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({ children, onRetry, className = '' }) => (
  <div
    role="alert"
    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-sm text-red-200 ${className}`}
  >
    <span>{children}</span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="rounded border border-red-300/50 px-2 py-1 text-xs font-semibold text-red-100 transition-colors hover:bg-red-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
      >
        Retry
      </button>
    )}
  </div>
);
