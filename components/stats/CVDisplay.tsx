'use client';

import React, { useState, useMemo } from 'react';
import { getCVRating, getCVRatingColor, CV_RATINGS, CVRating } from '@/lib/calculations/cv';
import { useStats } from '@/contexts';

interface CVDisplayProps {
  className?: string;
  compact?: boolean;
}

// Rating descriptions for tooltips
const RATING_DESCRIPTIONS: Record<CVRating, string> = {
  'Godlike': 'Exceptional CV - Top tier optimization',
  'Excellent': 'Outstanding CV - Highly optimized build',
  'Great': 'Very good CV - Well-built character',
  'Good': 'Solid CV - Good progress on substats',
  'Average': 'Decent CV - Room for improvement',
  'Below Average': 'Low CV - Consider upgrading echoes',
  'Needs Work': 'Very low CV - Focus on crit substats'
};

// CV thresholds for visual bar
const CV_MAX_DISPLAY = 300; // Max CV for progress bar visualization

export const CVDisplay: React.FC<CVDisplayProps> = ({
  className = '',
  compact = false
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { stats } = useStats();

  const cv = stats.cv;
  const rating = getCVRating(cv);
  const ratingColor = getCVRatingColor(cv);

  // Calculate progress percentage for visual bar
  const progressPercent = useMemo(() => {
    return Math.min((cv / CV_MAX_DISPLAY) * 100, 100);
  }, [cv]);

  // Get crit stats for breakdown
  const critRate = stats.updates['Crit Rate'] ?? 0;
  const critDmg = stats.updates['Crit DMG'] ?? 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-text-primary/60">CV:</span>
        <span
          className="font-bold"
          style={{ color: ratingColor }}
        >
          {cv.toFixed(1)}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${ratingColor}20`,
            color: ratingColor
          }}
        >
          {rating}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border bg-background-secondary p-4 ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-text-primary">Critical Value (CV)</span>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-xs text-accent hover:text-accent/80 transition-colors"
        >
          {showBreakdown ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Main CV Display */}
      <div className="flex items-center gap-4">
        {/* CV Value */}
        <div className="flex flex-col items-center">
          <span
            className="text-3xl font-bold"
            style={{ color: ratingColor }}
          >
            {cv.toFixed(1)}
          </span>
          <span
            className="mt-1 rounded-full px-3 py-1 text-sm font-medium"
            style={{
              backgroundColor: `${ratingColor}20`,
              color: ratingColor
            }}
          >
            {rating}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="relative h-4 overflow-hidden rounded-full bg-background">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${ratingColor}40, ${ratingColor})`
              }}
            />
            {/* Threshold markers */}
            {Object.entries(CV_RATINGS).map(([key, threshold]) => {
              const position = (threshold / CV_MAX_DISPLAY) * 100;
              if (position > 100) return null;
              return (
                <div
                  key={key}
                  className="absolute top-0 h-full w-px bg-text-primary/20"
                  style={{ left: `${position}%` }}
                  title={`${key}: ${threshold}`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-xs text-text-primary/40">
            <span>0</span>
            <span>150</span>
            <span>300+</span>
          </div>
        </div>
      </div>

      {/* Rating Description */}
      <div className="mt-3 text-sm text-text-primary/60">
        {RATING_DESCRIPTIONS[rating]}
      </div>

      {/* Breakdown Section */}
      {showBreakdown && (
        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <div className="mb-2 text-xs font-medium text-text-primary/70">CV Breakdown</div>

          {/* Formula */}
          <div className="mb-3 rounded bg-background-secondary p-2 font-mono text-xs">
            <div className="text-text-primary/50">CV = (Crit Rate x 2) + Crit DMG</div>
            <div className="mt-1 text-text-primary">
              CV = ({critRate.toFixed(1)} x 2) + {critDmg.toFixed(1)}
            </div>
            <div className="mt-1" style={{ color: ratingColor }}>
              CV = {(critRate * 2).toFixed(1)} + {critDmg.toFixed(1)} = {cv.toFixed(1)}
            </div>
          </div>

          {/* Stat contributions */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-background-secondary p-2">
              <div className="text-xs text-text-primary/50">Crit Rate Contribution</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-text-primary">
                  {critRate.toFixed(1)}%
                </span>
                <span className="text-xs text-text-primary/50">x2 =</span>
                <span className="text-sm font-medium text-green-400">
                  {(critRate * 2).toFixed(1)}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background-secondary p-2">
              <div className="text-xs text-text-primary/50">Crit DMG Contribution</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-text-primary">
                  {critDmg.toFixed(1)}%
                </span>
                <span className="text-xs text-text-primary/50">=</span>
                <span className="text-sm font-medium text-green-400">
                  {critDmg.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Rating thresholds */}
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-text-primary/70">Rating Thresholds</div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {Object.entries(CV_RATINGS)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([key, threshold]) => (
                  <div
                    key={key}
                    className={`rounded px-2 py-1 text-center ${
                      cv >= threshold ? 'bg-accent/20 text-accent' : 'bg-background text-text-primary/40'
                    }`}
                  >
                    {threshold}+
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVDisplay;
