'use client';

import type { ReactNode } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateWeaponStats } from '@/lib/calculations/stats';
import { Weapon } from '@/lib/weapon';
import { RARITY_ACCENTS } from '@/components/weapon/rarityStyles';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';
import { GlossaryNotes } from '@/components/ui/GlossaryNotes';
import { HoverCard, HoverCardIcon, HoverCardSection, HoverCardDescription } from '@/components/ui/HoverCard';
import type { HoverCardChipModel, HoverCardPlacement } from '@/components/ui/HoverCard';

interface WeaponHoverCardProps {
  children: ReactNode;
  weapon: Weapon;
  /** Level the ATK and main stat are shown at. Defaults to 90, the only level board and shelf surfaces care about. */
  weaponLevel?: number;
  weaponRank: number;
  placement?: HoverCardPlacement;
  triggerClassName?: string;
}

/**
 * ATK and the main stat are derived here from the shared level curves
 * (`calculateWeaponStats`), the same call the card's WeaponGroup makes. Every
 * weapon scales on the one ATK_CURVE / STAT_CURVE in LevelCurve.json (x12.5 and
 * x4.5 at 90/90), so callers only say which level, never the multiplier.
 */
export function WeaponHoverCard({
  children,
  weapon,
  weaponLevel = 90,
  weaponRank,
  placement = 'right',
  triggerClassName,
}: WeaponHoverCardProps) {
  const { t } = useLanguage();
  const { levelCurves, statIcons } = useGameData();
  const { scaledAtk, scaledMainStat } = calculateWeaponStats(weapon, weaponLevel, levelCurves);
  const atkIcon = statIcons?.ATK ?? null;
  const mainStatIcon = weapon.main_stat ? (statIcons?.[weapon.main_stat] ?? null) : null;
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
            <>
              <HoverCardDescription>{renderedPassive}</HoverCardDescription>
              <GlossaryNotes template={passiveTemplate} />
            </>
          )}
        </HoverCardSection>
      ) : undefined}
    >
      {children}
    </HoverCard>
  );
}
