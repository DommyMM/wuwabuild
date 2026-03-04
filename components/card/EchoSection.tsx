'use client';

import React from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { isPercentStat } from '@/lib/constants/statMappings';
import { calculateEchoSubstatCV, getEchoCVTierStyle } from '@/lib/calculations/cv';
import { getSubstatTierColor } from '@/lib/calculations/substatTiers';
import { getEchoPaths } from '@/lib/paths';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';
import { isRover } from '@/lib/character';

interface EchoSectionProps {
  echoPanels: EchoPanelState[];
  showCV?: boolean;
  showRollQuality?: boolean;
  activeHoverStat?: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
}

const ECHO_IMAGE_FADE_STYLE: React.CSSProperties = {
  maskImage: 'linear-gradient(90deg, #000 30%, transparent 90%)',
  WebkitMaskImage: 'linear-gradient(90deg, #000 30%, transparent 90%)',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskSize: '100% 100%',
  WebkitMaskSize: '100% 100%',
};

const ROVER_ELEMENT_TOKENS = new Set(['Aero', 'Havoc', 'Spectro']);

const matchesEchoBonusCondition = (
  conditions: string[] | undefined,
  characterName: string | undefined,
  isRoverCharacter: boolean,
  roverElement: string | undefined
): boolean => {
  if (!conditions || conditions.length === 0) return true;

  return conditions.some((condition) => {
    const token = condition.trim();
    if (!token) return false;
    if (characterName === token) return true;
    if (isRoverCharacter && roverElement && ROVER_ELEMENT_TOKENS.has(token)) {
      return roverElement === token;
    }
    return false;
  });
};

export const EchoSection: React.FC<EchoSectionProps> = ({
  echoPanels,
  showCV = true,
  showRollQuality = true,
  activeHoverStat = null,
  onHoverStatChange,
}) => {
  const { getEcho, fettersByElement, statIcons, getSubstatValues } = useGameData();
  const { state } = useBuild();
  const { t } = useLanguage();
  const selected = useSelectedCharacter();
  const hasActiveHover = Boolean(activeHoverStat);
  const characterName = selected?.character.name;
  const isRoverCharacter = selected ? isRover(selected.character) : false;

  const getPillInteractionClass = (hoverKey: StatHoverKey | null): string => {
    if (!hasActiveHover) return '';
    if (hoverKey && activeHoverStat === hoverKey) {
      return 'opacity-100 ring-1 ring-white/34 shadow-[0_0_10px_rgba(255,255,255,0.22)]';
    }
    return 'opacity-45';
  };

  const getPillInteractionStyle = (
    hoverKey: StatHoverKey | null,
    baseStyle?: React.CSSProperties
  ): React.CSSProperties | undefined => {
    if (!hasActiveHover) return baseStyle;
    if (hoverKey && activeHoverStat === hoverKey) return baseStyle;

    return {
      ...baseStyle,
      boxShadow: 'inset 0 0 0 999px rgba(0,0,0,0.18)',
      filter: 'blur(0.2px) saturate(0.8) brightness(0.86)',
    };
  };

  return (
    <div className="flex gap-2 h-full p-4">
      {/* Echo cards row */}
      {echoPanels.map((panel, i) => {
          const echo = panel.id ? getEcho(panel.id) : null;

          if (!echo) {
            return (
              <div
                key={i}
                className="relative flex h-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_-14px_24px_rgba(0,0,0,0.16),0_8px_16px_rgba(0,0,0,0.35)]"
              >
                <div className="h-7 w-7 rounded-full border-2 border-dashed border-white/20" />
              </div>
            );
          }

          const elementType = echo.elements.length === 1 ? echo.elements[0] : panel.selectedElement;
          const fetter = elementType ? fettersByElement[elementType] : null;
          const echoName = echo.nameI18n ? t(echo.nameI18n) : echo.name;
          const fetterIcon = fetter?.icon ?? fetter?.fetterIcon ?? null;

          const mainStatType = panel.stats.mainStat.type?.trim() || null;
          const mainStatValue = panel.stats.mainStat.value;
          const mainStatIcon = mainStatType
            ? (statIcons?.[mainStatType] ?? statIcons?.[mainStatType.replace('%', '')])
            : null;
          const isMainPercent = mainStatType ? isPercentStat(mainStatType) : false;
          const mainHoverKey = normalizeStatHoverKey(mainStatType);

          const substats = panel.stats.subStats.filter(
            (sub) => Boolean(sub.type?.trim()) && sub.value != null
          );
          const firstEchoBonusHoverMatch = i === 0 && Boolean(activeHoverStat) && (echo.bonuses?.some((bonus) => {
            const bonusHoverKey = normalizeStatHoverKey(bonus.stat);
            if (!bonusHoverKey || bonusHoverKey !== activeHoverStat) return false;

            return matchesEchoBonusCondition(
              bonus.characterCondition,
              characterName,
              isRoverCharacter,
              state.roverElement
            );
          }) ?? false);

          const echoCV = calculateEchoSubstatCV(panel);
          const cvTier = echoCV > 0 ? getEchoCVTierStyle(echoCV) : null;

          return (
            <div
              key={i}
              className="relative flex flex-1 rounded-xl border overflow-hidden border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)] transition-all duration-200"
            >
              {/* Top-left stack: CV badge */}
              <div className="absolute top-1 left-1 z-10 flex flex-col items-start gap-1">
                {showCV && cvTier && (
                  <div
                    className="flex items-center rounded-md border px-2 py-1"
                    style={{
                      borderColor: `${cvTier.color}66`,
                      color: cvTier.color,
                      backgroundColor: cvTier.bgColor ?? 'rgba(0,0,0,0.80)',
                    }}
                  >
                    <span className="text-xs font-bold leading-none">{echoCV.toFixed(1)} CV</span>
                  </div>
                )}
              </div>
              {/* Echo image and misc */}
              <div className="flex w-2/3 flex-col overflow-hidden">
                <div className="relative rounded-sm">
                  <img
                    src={getEchoPaths(echo, panel.phantom)}
                    alt={echoName}
                    className={`w-full h-auto transition-all duration-200 ${firstEchoBonusHoverMatch ? 'brightness-110 saturate-110' : ''}`}
                    style={ECHO_IMAGE_FADE_STYLE}
                  />
                  {firstEchoBonusHoverMatch && (
                    <div className="pointer-events-none absolute inset-0 border-2 border-cyan-200/90 shadow-[inset_0_0_12px_rgba(110,255,255,0.24),0_0_16px_rgba(110,255,255,0.45)]" />
                  )}
                </div>
                <div className="relative mb-1 h-px w-1/2 bg-[linear-gradient(90deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.09)_55%,rgba(255,255,255,0)_100%)]">
                  {fetterIcon && (
                    <img
                      src={fetterIcon}
                      alt={elementType ?? ''}
                      className="absolute left-full top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
                    />
                  )}
                </div>
                {/* Main Stat */}
                <div className="flex p-2">
                  {mainStatType && mainStatValue != null && (
                    <div
                      className={`flex items-center gap-1 rounded-lg border border-white/10 bg-black/55 px-1.5 py-0.5 transition-all duration-200 ${getPillInteractionClass(mainHoverKey)}`}
                      style={getPillInteractionStyle(mainHoverKey)}
                      onMouseEnter={mainHoverKey ? () => onHoverStatChange?.(mainHoverKey) : undefined}
                      onMouseLeave={mainHoverKey ? () => onHoverStatChange?.(null) : undefined}
                    >
                      {mainStatIcon && (
                        <img src={mainStatIcon} alt={mainStatType} className="h-4 w-4 object-contain" />
                      )}
                      <span className="text-sm font-semibold">
                        {isMainPercent
                          ? `${mainStatValue.toFixed(1)}%`
                          : Math.round(mainStatValue).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Echo substats */}
              <div className="flex flex-col items-start justify-between py-3 -ml-5">
                {Array.from({ length: 5 }).map((_, si) => {
                  const sub = substats[si];
                  if (!sub?.type || sub.value == null) {
                    return <div key={si} className="h-5" />;
                  }

                  const subType = sub.type.trim();
                  const isSubPercent = isPercentStat(subType);
                  const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')];
                  const tierColor = showRollQuality
                    ? getSubstatTierColor(subType, sub.value, getSubstatValues(subType))
                    : null;
                  const subHoverKey = normalizeStatHoverKey(subType);
                  const baseStyle = tierColor ? {
                    backgroundColor: `${tierColor}18`,
                    borderBottom: `1px solid ${tierColor}80`,
                  } : undefined;

                  return (
                    <div
                      key={si}
                      className={`flex items-center gap-1 rounded-sm px-1 py-0.5 transition-all duration-200 ${getPillInteractionClass(subHoverKey)}`}
                      style={getPillInteractionStyle(subHoverKey, baseStyle)}
                      onMouseEnter={subHoverKey ? () => onHoverStatChange?.(subHoverKey) : undefined}
                      onMouseLeave={subHoverKey ? () => onHoverStatChange?.(null) : undefined}
                    >
                      {subIcon && (
                        <img src={subIcon} alt={subType} className="h-4.5 w-4.5 object-contain" />
                      )}
                      <span className="text-sm leading-none font-semibold">
                        {isSubPercent ? `${sub.value.toFixed(1)}%` : Math.round(sub.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
};
