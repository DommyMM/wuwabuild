import React from 'react';
import { STATUS_NEGATIVE_COLOR, STATUS_POSITIVE_COLOR } from '../constants';

export type ProfileSegment = { key: string; color: string; damage: number };

interface ProfileBarProps {
  /** Part-to-whole pieces of move damage, by scored type or by heal source */
  segments: ProfileSegment[];
  /** Positive score bonuses, drawn after the move damage */
  bonuses: ProfileSegment[];
  /** Score removed by penalties (Energy Regen), hatched over the bar's end */
  lostDamage: number;
  isDimmed?: (key: string) => boolean;
  onSegmentEnter?: (key: string) => void;
  onSegmentLeave?: () => void;
  playing: boolean;
}

/** One thin part-to-whole bar, the same shape the home hero draws from the same type totals */
export const ProfileBar: React.FC<ProfileBarProps> = ({
  segments,
  bonuses,
  lostDamage,
  isDimmed,
  onSegmentEnter,
  onSegmentLeave,
  playing,
}) => {
  const total = [...segments, ...bonuses].reduce((sum, segment) => sum + Math.max(0, segment.damage), 0);
  const lostPercent = total > 0 && lostDamage > 0 ? Math.min(100, (lostDamage / total) * 100) : 0;

  return (
    <div aria-hidden className={`relative flex h-1.5 w-full gap-0.5 ${playing ? 'mb-grow' : ''}`} onPointerLeave={onSegmentLeave}>
      {segments.map((segment) => (
        <span
          key={segment.key}
          className="block h-full min-w-0.5 rounded-[1px] transition-opacity duration-150 motion-reduce:transition-none"
          style={{
            flexGrow: Math.max(0, segment.damage),
            flexBasis: 0,
            backgroundColor: segment.color,
            opacity: isDimmed?.(segment.key) ? 0.3 : 1,
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') onSegmentEnter?.(segment.key);
          }}
        />
      ))}
      {bonuses.map((bonus) => (
        <span
          key={bonus.key}
          className="block h-full min-w-0.5 rounded-[1px]"
          style={{ flexGrow: Math.max(0, bonus.damage), flexBasis: 0, backgroundColor: STATUS_POSITIVE_COLOR }}
        />
      ))}
      {lostPercent > 0 && (
        <span
          className="pointer-events-none absolute -top-0.75 -bottom-0.75 right-0 rounded-r-xs border-l-2 border-text-primary"
          style={{
            width: `${lostPercent}%`,
            background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${STATUS_NEGATIVE_COLOR} 85%, transparent) 0 2px, transparent 2px 5px)`,
          }}
        />
      )}
    </div>
  );
};
