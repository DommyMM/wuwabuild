import React from 'react';

/** skillTab → the character's skillIcons key */
const TAB_ICON_KEY: Record<string, string> = {
  'normal-attack': 'normal-attack',
  skill: 'skill',
  liberation: 'liberation',
  circuit: 'circuit',
  intro: 'intro',
  outro: 'outro',
  // Inherent skills have two icons, a scored inherent ability takes the first
  inherent: 'inherent-1',
  // Real kit button with one of five weapon-type icons, the glyph only covers data missing that key
  'tune-break': 'tune-break',
};

/** Neutral glyphs for damage with no kit button, on a 24 box in text colour so each sits at a tab icon's weight */
function Glyph({ kind }: { kind: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-[58%] w-[58%]',
    'aria-hidden': true,
  };
  switch (kind) {
    case 'tune-break':
      return <svg {...common}><path d="M2 12c2.2 0 2.2-6 4.4-6s2.2 12 4.4 12 2.2-12 4.4-12 2.2 12 4.4 12S21.8 12 22 12" /></svg>;
    case 'echo':
      return <svg {...common}><path d="M12 3.5l7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z" /><circle cx="12" cy="12" r="2.4" /></svg>;
    case 'set':
      return <svg {...common}><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></svg>;
    case 'weapon':
      return <svg {...common}><path d="M5 19L17 7M14.5 4.5L19.5 4.5L19.5 9.5M7.5 13.5l3 3M4 20l1.8-.6-1.2-1.2z" /></svg>;
    case 'merged':
      return <svg {...common}><path d="M6 8h12M6 12h12M6 16h12" /></svg>;
    case 'mixed':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <circle cx="8" cy="8" r="2" /><circle cx="16" cy="8" r="2" /><circle cx="8" cy="16" r="2" /><circle cx="16" cy="16" r="2" />
        </svg>
      );
    case 'status':
      return <svg {...common}><circle cx="12" cy="12" r="7" strokeDasharray="3 3" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></svg>;
    default:
      return <svg {...common} fill="currentColor" stroke="none"><circle cx="12" cy="12" r="2.5" /></svg>;
  }
}

interface SkillTabDiscProps {
  skillTab: string;
  merged?: boolean;
  skillIcons?: Record<string, string>;
  elementIcon?: string;
  /** Scored-type colour, drawn as a short arc under the icon */
  arcColor?: string;
  /** Brightens the ring to the hover mark used on ribbon segments */
  lit?: boolean;
  /** Size classes, the disc is square */
  className?: string;
}

/** The ability's kit button: its tab icon on a dark disc, the scored type a short arc along the disc's underside */
export const SkillTabDisc: React.FC<SkillTabDiscProps> = ({
  skillTab,
  merged = false,
  skillIcons,
  elementIcon,
  arcColor,
  lit = false,
  className = 'size-9',
}) => {
  const iconKey = TAB_ICON_KEY[skillTab];
  const icon = iconKey ? skillIcons?.[iconKey] : undefined;
  // Arc runs about 7 to 5 o'clock, 12% to 38% of the circle clockwise from 3 o'clock, centred on the underside
  const arc = arcColor ? (
    <svg viewBox="0 0 36 36" className="pointer-events-none absolute inset-0 h-full w-full">
      <circle
        cx="18"
        cy="18"
        r="16.6"
        fill="none"
        stroke={arcColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray="26 100"
        strokeDashoffset="-12"
      />
    </svg>
  ) : null;

  // Status damage has no button, so it gets a dashed outline around the element icon instead, with the same arc
  if (skillTab === 'status') {
    return (
      <span className={`relative grid shrink-0 place-items-center rounded-full border border-dashed text-white/80 transition-colors duration-150 ${lit ? 'border-white/75' : 'border-white/25'} ${className}`} aria-hidden>
        {elementIcon ? <img src={elementIcon} alt="" className="h-[84%] w-[84%] object-contain" /> : <Glyph kind="status" />}
        {arc}
      </span>
    );
  }

  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_32%,#232323,#0b0b0b_72%)] text-white/85 transition-shadow duration-150 ${lit ? 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.75)]' : 'shadow-[inset_0_0_0_1px_#3a3a3a]'} ${className}`}
      aria-hidden
    >
      {icon ? (
        <img src={icon} alt="" className="h-[72%] w-[72%] object-contain opacity-95" />
      ) : (
        <Glyph kind={merged ? 'merged' : skillTab} />
      )}
      {arc}
    </span>
  );
};
