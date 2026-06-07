'use client';

import React, { ReactNode } from 'react';
import { HoverTooltip } from '@/components/ui/HoverTooltip';

type TooltipPlacement = 'right' | 'left' | 'top' | 'bottom';

type ChipTone = 'default' | 'amber' | 'cyan';
type BadgeTone = 'orange' | 'amber' | 'cyan' | 'muted';

export interface HoverCardChipModel {
  label?: ReactNode;
  icon?: string | null;
  iconAlt?: string;
  tone?: ChipTone;
  // Arbitrary accent color (e.g. an element color). Overrides `tone` when set.
  color?: string;
}

interface HoverCardProps {
  children: ReactNode;
  placement?: TooltipPlacement;
  strictPlacement?: boolean;
  disabled?: boolean;
  triggerClassName?: string;
  icon?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: { text: ReactNode; tone?: BadgeTone };
  chips?: HoverCardChipModel[];
  body?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  maxRisePx?: number;
}

const WIDTH_CLASS: Record<NonNullable<HoverCardProps['width']>, string> = {
  sm: 'w-[18rem]',
  md: 'w-96',
  lg: 'w-96',
};

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  orange: 'text-orange-400',
  amber: 'text-amber-300',
  cyan: 'text-cyan-200',
  muted: 'text-white/65',
};

// Icon hangs outside the panel top-left (Akasha style).
const ICON_HANG_TOP = -18;
const ICON_HANG_LEFT = -18;
const DEFAULT_ICON_SIZE = 96;
// Padding-left applied to the header so it clears the icon footprint inside the panel.
const HEADER_INDENT_CLASS = 'pl-[5.5rem]';

interface HoverCardIconProps {
  src?: string | null;
  alt?: string;
  size?: number;
  borderClass?: string;
  bgClass?: string;
  cornerBadge?: ReactNode;
  bottomDecoration?: ReactNode;
  imgClassName?: string;
}

export const HoverCardIcon: React.FC<HoverCardIconProps> = ({
  src,
  alt = '',
  size = DEFAULT_ICON_SIZE,
  borderClass = 'border-white/24',
  bgClass = 'bg-black/40',
  cornerBadge,
  bottomDecoration,
  imgClassName = 'h-full w-full object-contain',
}) => (
  <div
    style={{ width: size, height: size }}
    className={`relative flex items-center justify-center overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.09)_24%,transparent_58%),linear-gradient(145deg,rgba(120,90,54,0.88)_0%,rgba(47,48,48,0.96)_48%,rgba(20,21,22,0.98)_100%)] ${borderClass} ${bgClass} shadow-[0_10px_22px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.14)]`}
  >
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,transparent_36%,rgba(0,0,0,0.20)_100%)]" />
    {src && <img src={src} alt={alt} className={imgClassName} loading="lazy" />}
    {cornerBadge && (
      <div className="pointer-events-none absolute -top-1 -right-1 z-10">
        {cornerBadge}
      </div>
    )}
    {bottomDecoration && (
      <div className="pointer-events-none absolute right-0 bottom-1 left-0 z-10 flex items-end justify-center leading-none [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
        {bottomDecoration}
      </div>
    )}
  </div>
);

interface HoverCardChipsProps {
  chips: HoverCardChipModel[];
}

const HoverCardChips: React.FC<HoverCardChipsProps> = ({ chips }) => (
  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
    {chips.map((chip, i) => {
      const toneClass = chip.color
        ? ''
        : chip.tone === 'amber'
          ? 'border-amber-300/30 bg-amber-300/12 text-amber-100/95'
          : chip.tone === 'cyan'
            ? 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100/95'
            : 'border-white/10 bg-black/30 text-white/82';
      const colorStyle: React.CSSProperties | undefined = chip.color
        ? {
          borderColor: `color-mix(in srgb, ${chip.color} 42%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${chip.color} 15%, transparent)`,
          color: `color-mix(in srgb, ${chip.color} 80%, white)`,
        }
        : undefined;
      return (
        <span
          key={i}
          className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${toneClass}`}
          style={colorStyle}
        >
          {chip.icon && (
            <img
              src={chip.icon}
              alt={chip.iconAlt ?? ''}
              className="h-3.5 w-3.5 object-contain"
              loading="lazy"
            />
          )}
          {chip.label !== undefined && (
            <span className="font-semibold">{chip.label}</span>
          )}
        </span>
      );
    })}
  </div>
);

interface HoverCardSectionProps {
  title?: ReactNode;
  badge?: { text: ReactNode; tone?: BadgeTone };
  eyebrow?: ReactNode;
  children?: ReactNode;
  variant?: 'plain' | 'inset';
  className?: string;
}

export const HoverCardSection: React.FC<HoverCardSectionProps> = ({
  title,
  badge,
  eyebrow,
  children,
  variant = 'plain',
  className = '',
}) => {
  const wrapperClass = variant === 'inset'
    ? 'rounded-lg border border-white/12 bg-black/30 px-2 py-1.5'
    : '';
  const badgeToneClass = badge ? BADGE_TONE_CLASS[badge.tone ?? 'orange'] : '';
  return (
    <div className={`${wrapperClass} ${className}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wide text-white/65">
          {eyebrow}
        </p>
      )}
      {title && (
        <p className={`${eyebrow ? 'mt-0.5' : ''} text-sm font-semibold text-white/95`}>
          {title}
          {badge && <span className={`ml-1 ${badgeToneClass}`}>{badge.text}</span>}
        </p>
      )}
      {children && (
        <div className={`${title || eyebrow ? 'mt-0.5' : ''} text-sm leading-relaxed text-white/86`}>
          {children}
        </div>
      )}
    </div>
  );
};

interface HoverCardBonusItem {
  name: ReactNode;
  value: ReactNode;
  prefix?: string; // e.g. '+' for stat bonuses
}

interface HoverCardBonusListProps {
  items: HoverCardBonusItem[];
}

export const HoverCardBonusList: React.FC<HoverCardBonusListProps> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <p key={i} className="text-sm leading-relaxed text-white/86">
          <span>{item.name}</span>{' '}
          <span className="font-semibold text-cyan-200">
            {item.prefix ?? ''}{item.value}
          </span>
        </p>
      ))}
    </div>
  );
};

interface HoverCardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const HoverCardDescription: React.FC<HoverCardDescriptionProps> = ({
  children,
  className = '',
}) => (
  <p className={`whitespace-pre-line text-sm leading-relaxed text-white/86 ${className}`}>
    {children}
  </p>
);

const HoverCardPanel: React.FC<{
  icon?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: { text: ReactNode; tone?: BadgeTone };
  chips?: HoverCardChipModel[];
  body?: ReactNode;
  width: NonNullable<HoverCardProps['width']>;
}> = ({ icon, eyebrow, title, subtitle, badge, chips, body, width }) => {
  const headerIndentClass = icon ? `${HEADER_INDENT_CLASS} min-h-[4.75rem]` : '';
  const badgeToneClass = badge ? BADGE_TONE_CLASS[badge.tone ?? 'orange'] : '';

  return (
    <div className={`font-plus-jakarta ${WIDTH_CLASS[width]} text-white/90`}>
      <div className={headerIndentClass}>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-white/65">
            {eyebrow}
          </p>
        )}
        <p className={`${eyebrow ? 'mt-0.5' : ''} text-base font-semibold leading-tight text-white/96`}>
          {title}
          {badge && <span className={`ml-1.5 ${badgeToneClass}`}>{badge.text}</span>}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-white/65">
            {subtitle}
          </p>
        )}
        {chips && chips.length > 0 && <HoverCardChips chips={chips} />}
      </div>
      {body && <div className="mt-3 space-y-1.5">{body}</div>}
    </div>
  );
};

export const HoverCard: React.FC<HoverCardProps> = ({
  children,
  placement = 'right',
  strictPlacement = false,
  disabled = false,
  triggerClassName,
  icon,
  eyebrow,
  title,
  subtitle,
  badge,
  chips,
  body,
  width = 'md',
  maxRisePx,
}) => {
  const leadingNode = icon ? (
    <div
      className="pointer-events-none absolute z-10"
      style={{ top: ICON_HANG_TOP, left: ICON_HANG_LEFT }}
    >
      {icon}
    </div>
  ) : undefined;

  return (
    <HoverTooltip
      placement={placement}
      strictPlacement={strictPlacement}
      disabled={disabled}
      triggerClassName={triggerClassName}
      maxRisePx={maxRisePx}
      leadingNode={leadingNode}
      visualOverflow={icon ? {
        top: Math.abs(Math.min(0, ICON_HANG_TOP)),
        left: Math.abs(Math.min(0, ICON_HANG_LEFT)),
      } : undefined}
      content={(
        <HoverCardPanel
          icon={icon}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          badge={badge}
          chips={chips}
          body={body}
          width={width}
        />
      )}
    >
      {children}
    </HoverTooltip>
  );
};
