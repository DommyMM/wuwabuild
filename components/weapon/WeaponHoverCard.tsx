'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Weapon } from '@/lib/weapon';
import { RARITY_ACCENTS } from '@/components/weapon/rarityStyles';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';
import { HoverCard, HoverCardIcon, HoverCardSection, HoverCardDescription } from '@/components/ui/HoverCard';
import type { HoverCardChipModel, HoverCardPlacement } from '@/components/ui/HoverCard';

interface WeaponHoverCardProps {
  children: ReactNode;
  weapon: Weapon;
  weaponLevel: number;
  weaponRank: number;
  scaledAtk: number;
  scaledMainStat: number;
  atkIcon?: string | null;
  mainStatIcon?: string | null;
  placement?: HoverCardPlacement;
  triggerClassName?: string;
}

export function WeaponHoverCard({
  children,
  weapon,
  weaponLevel,
  weaponRank,
  scaledAtk,
  scaledMainStat,
  atkIcon,
  mainStatIcon,
  placement = 'right',
  triggerClassName,
}: WeaponHoverCardProps) {
  const { t } = useLanguage();
  const weaponName = t(weapon.nameI18n ?? { en: weapon.name });
  const passiveName = t(weapon.effectName ?? { en: '' });
  const passiveTemplate = t(weapon.effect ?? { en: '' });
  const mainStatName = t(weapon.mainStatI18n ?? { en: weapon.main_stat ?? '' });
  const rarityStyle = RARITY_ACCENTS[weapon.rarity];
  const rankIndex = Math.max(0, Math.min(4, Math.floor(weaponRank || 1) - 1));
  const renderedPassive = renderGameTemplateWithHighlights({
    template: passiveTemplate,
    getParamValue: (paramIndex) => {
      const slotValues = weapon.params?.[String(paramIndex)];
      if (!slotValues?.length) return null;
      return slotValues[Math.min(rankIndex, slotValues.length - 1)] ?? null;
    },
    highlightClassName: 'text-cyan-200 font-semibold',
    keepUnknownPlaceholders: true,
  });

  const icon = (
    <HoverCardIcon
      src={weapon.iconUrl}
      alt={weaponName || weapon.name}
      borderClass={rarityStyle?.border ?? 'border-white/28'}
      bgClass={rarityStyle?.bg ?? 'bg-black/40'}
    />
  );

  const chips: HoverCardChipModel[] = [
    { label: `Lv ${weaponLevel}` },
    { icon: atkIcon ?? undefined, iconAlt: 'ATK', label: String(scaledAtk) },
  ];
  if (weapon.main_stat) {
    chips.push({ icon: mainStatIcon ?? undefined, iconAlt: mainStatName, label: `${scaledMainStat}%` });
  }

  return (
    <HoverCard
      placement={placement}
      triggerClassName={triggerClassName}
      icon={icon}
      title={weaponName || weapon.name}
      subtitle={`${weapon.rarity} ${weapon.type}`}
      chips={chips}
      body={(passiveName || passiveTemplate) ? (
        <HoverCardSection
          title={passiveName || 'Passive'}
          badge={{ text: `R${weaponRank}`, tone: 'orange' }}
        >
          {passiveTemplate && (
            <HoverCardDescription>{renderedPassive}</HoverCardDescription>
          )}
        </HoverCardSection>
      ) : undefined}
    >
      {children}
    </HoverCard>
  );
}
