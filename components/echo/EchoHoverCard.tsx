'use client';

import React, { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Echo, CDNFetter } from '@/lib/echo';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';
import {
  HoverCard,
  HoverCardIcon,
  HoverCardSection,
  HoverCardDescription,
  HoverCardChipModel,
} from '@/components/ui/HoverCard';

interface EchoHoverCardProps {
  children: ReactNode;
  echo: Echo;
  placement?: 'right' | 'left' | 'top' | 'bottom';
  triggerClassName?: string;
  // The sonata set this echo is actually equipped into. When provided, the card
  // shows only that set (colorized) instead of every set the echo can roll.
  resolvedFetter?: CDNFetter | null;
}

// Prop IDs for the six damage-element bonuses (from PhantomFetter AddProp).
const DMG_PROP_ID_TO_COLOR: Record<number, string> = {
  22: 'var(--color-glacio)',
  23: 'var(--color-fusion)',
  24: 'var(--color-electro)',
  25: 'var(--color-aero)',
  26: 'var(--color-spectro)',
  27: 'var(--color-havoc)',
};

// A sonata set's accent color comes from its damage-element bonus, if it has one.
// Utility sets (Energy Regen, Healing, ATK%) have no element color → undefined.
export const getFetterElementColor = (fetter: CDNFetter): string | undefined => {
  const propGroups: Array<Array<{ id: number }>> = [];
  for (const effect of Object.values(fetter.pieceEffects ?? {})) {
    if (Array.isArray(effect.addProp)) propGroups.push(effect.addProp);
  }
  if (Array.isArray(fetter.addProp)) propGroups.push(fetter.addProp);
  for (const group of propGroups) {
    for (const prop of group) {
      const color = DMG_PROP_ID_TO_COLOR[prop.id];
      if (color) return color;
    }
  }
  return undefined;
};

export const EchoHoverCard: React.FC<EchoHoverCardProps> = ({
  children,
  echo,
  placement = 'right',
  triggerClassName,
  resolvedFetter,
}) => {
  const { t } = useLanguage();
  const { getFetterByElement } = useGameData();

  const echoName = t(echo.nameI18n ?? { en: echo.name });
  const skillTemplate = echo.skill?.description ? t(echo.skill.description) : '';
  const levelOneParams = echo.skill?.params?.[0] ?? [];

  const setChips: HoverCardChipModel[] = resolvedFetter
    ? [{
      label: t(resolvedFetter.name),
      icon: resolvedFetter.icon,
      color: getFetterElementColor(resolvedFetter),
    }]
    : echo.elements
      .map((element) => getFetterByElement(element))
      .filter((fetter): fetter is NonNullable<ReturnType<typeof getFetterByElement>> => Boolean(fetter))
      .map((fetter) => ({ label: t(fetter.name) }));

  const chips: HoverCardChipModel[] = [
    { label: `Cost ${echo.cost}`, tone: 'amber' },
    ...setChips,
  ];

  const icon = (
    <HoverCardIcon
      src={echo.iconUrl}
      alt={echoName}
      borderClass="border-white/24"
      bgClass="bg-black/45"
    />
  );

  const body = skillTemplate ? (
    <HoverCardSection variant="plain">
      <HoverCardDescription>
        {renderGameTemplateWithHighlights({
          template: skillTemplate,
          getParamValue: (index) => levelOneParams[index] ?? null,
          highlightClassName: 'text-cyan-200 font-semibold',
          keepUnknownPlaceholders: true,
        })}
      </HoverCardDescription>
    </HoverCardSection>
  ) : undefined;

  return (
    <HoverCard
      placement={placement}
      triggerClassName={triggerClassName}
      icon={icon}
      title={echoName}
      chips={chips}
      body={body}
    >
      {children}
    </HoverCard>
  );
};
