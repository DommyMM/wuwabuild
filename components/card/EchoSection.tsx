'use client';

import React from 'react';
import { activeElementForPanel, EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { isPercentStat } from '@/lib/constants/statMappings';
import { calculateEchoSubstatCV, getEchoCVFrameColor, getEchoCVTierStyle } from '@/lib/calculations/rollValues';
import { getEchoPaths } from '@/lib/paths';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';
import { isRover } from '@/lib/character';
import { matchesEchoBonusCondition } from '@/lib/constants/statBonuses';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { EchoHoverCard } from '@/components/echo/EchoHoverCard';
import { FetterHoverCard } from '@/components/echo/FetterHoverCard';
import { EchoSubstatChip, getEchoChipVisuals, resolveEchoChipState } from '@/components/echo/EchoSubstatChip';
import { EchoCVBar, formatStatRoll, StatHoverRow } from '@/components/echo/StatTierBars';
import { HoverCard } from '@/components/ui/HoverCard';

interface EchoSectionProps {
  echoPanels: EchoPanelState[];
  showCV?: boolean;
  showRollQuality?: boolean;
  activeHoverStat?: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
  selectedSubstats?: ReadonlySet<string>;
}

export const ECHO_IMAGE_FADE_STYLE: React.CSSProperties = {
  maskImage: 'linear-gradient(90deg, #000 30%, transparent 90%)',
  WebkitMaskImage: 'linear-gradient(90deg, #000 30%, transparent 90%)',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskSize: '100% 100%',
  WebkitMaskSize: '100% 100%',
};

const PANEL_CLASS =
  'relative min-w-0 flex-1 overflow-hidden rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)] transition-all duration-200';

export const EchoSection: React.FC<EchoSectionProps> = ({
  echoPanels,
  showCV = true,
  showRollQuality = true,
  activeHoverStat = null,
  onHoverStatChange,
  selectedSubstats,
}) => {
  const { getEcho, fettersByElement, statIcons, statTranslations, getMainStatsByCost } = useGameData();
  const { state } = useBuild();
  const { t } = useLanguage();
  const selected = useSelectedCharacter();
  const hasActiveHover = Boolean(activeHoverStat);
  const hasSelection = Boolean(selectedSubstats?.size);
  const characterName = selected?.character.name;
  const isRoverCharacter = selected ? isRover(selected.character) : false;

  const chipStateFor = (statType: string | null, hoverKey: StatHoverKey | null) => resolveEchoChipState({
    hasHover: hasActiveHover,
    isHoverMatch: Boolean(hoverKey && activeHoverStat === hoverKey),
    hasSelection,
    isSelected: Boolean(statType && selectedSubstats?.has(statType)),
  });

  return (
    <div className="flex min-h-0 flex-1 gap-2 p-4 pt-3">
      {echoPanels.map((panel, i) => {
        const echo = panel.id ? getEcho(panel.id) : null;

        if (!echo) {
          return (
            <div key={i} className={`${PANEL_CLASS} flex items-center justify-center`}>
              <div className="h-7 w-7 rounded-full border-2 border-dashed border-white/20" />
            </div>
          );
        }

        // Trust the stored backend element.
        const elementType = activeElementForPanel(panel, echo);
        const fetter = elementType ? fettersByElement[elementType] : null;
        const echoName = echo.nameI18n ? t(echo.nameI18n) : echo.name;
        const fetterIcon = fetter?.icon ?? fetter?.fetterIcon ?? null;

        const mainStatType = panel.stats.mainStat.type?.trim() || null;
        const mainStatValue = panel.stats.mainStat.value;
        const mainStatIcon = mainStatType
          ? (statIcons?.[mainStatType] ?? statIcons?.[mainStatType.replace('%', '')])
          : null;
        const mainStatIconFilter = mainStatType ? ELEMENT_ICON_FILTERS[mainStatType] : undefined;
        const isMainPercent = mainStatType ? isPercentStat(mainStatType) : false;
        const mainStatLabel = mainStatType
          ? (statTranslations?.[mainStatType] ? t(statTranslations[mainStatType]) : mainStatType)
          : '';
        const mainStatRange: [number, number] | null = mainStatType
          ? (getMainStatsByCost(echo.cost ?? null)[mainStatType] ?? null)
          : null;
        // The main stat is not part of the substat selection, so it only ever reacts to hover.
        const mainHoverKey = normalizeStatHoverKey(mainStatType);
        const mainState = (
          !hasActiveHover ? 'plain' : (mainHoverKey && activeHoverStat === mainHoverKey) ? 'hovered' : 'shaded'
        );
        const mainVisuals = getEchoChipVisuals(mainState);
        const mainPlateClassName = mainState === 'plain'
          ? 'bg-black/75 opacity-100'
          : mainVisuals.className;

        const substats = panel.stats.subStats.filter(
          (sub) => Boolean(sub.type?.trim()) && sub.value != null
        );
        const firstEchoBonusHoverMatch = i === 0 && hasActiveHover && (echo.bonuses?.some((bonus) => {
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
        const frameBorderColor = getEchoCVFrameColor(echoCV);

        return (
          <div key={i} className={PANEL_CLASS} style={showCV ? { borderColor: `${frameBorderColor}b3` } : undefined}>
            {/* Artwork sizes itself off the panel height and fades out under the substat column.
                The stat-source glow animates `filter` on this unmasked wrapper: putting it on the
                masked img itself hits a Chromium filter+mask compositing bug that blanks the art. */}
            <div
              className={`absolute inset-y-0 left-0 z-0 origin-left transition-transform duration-200 ${
                firstEchoBonusHoverMatch ? 'card-stat-source-art scale-[1.04]' : ''
              }`}
            >
              <img
                src={getEchoPaths(echo, panel.phantom)}
                alt={echoName}
                className="h-full w-auto max-w-none object-cover"
                style={ECHO_IMAGE_FADE_STYLE}
              />
            </div>

            {/* Echo identity hover sits beneath the content layer, over the artwork half. */}
            <EchoHoverCard
              echo={echo}
              resolvedFetter={fetter}
              placement="top"
              triggerClassName="absolute inset-y-0 left-0 z-1 w-1/2 cursor-help"
            >
              <span aria-hidden className="block h-full w-full" />
            </EchoHoverCard>

            {/* Content layer is click-through so the echo hover behind it stays reachable;
                individual chips re-enable pointer events. */}
            <div className="pointer-events-none relative z-2 flex h-full justify-between">
              <div className="flex min-w-0 flex-col items-start justify-between p-2">
                {showCV && cvTier ? (
                  <HoverCard
                    placement="top"
                    width="md"
                    triggerClassName="pointer-events-auto inline-flex cursor-pointer"
                    title="Crit Value"
                    subtitle="2 × Crit Rate + Crit DMG"
                    body={<EchoCVBar cv={echoCV} />}
                  >
                    <div
                      className="flex items-center rounded-md border px-2 py-1"
                      style={{
                        borderColor: `${cvTier.color}66`,
                        color: cvTier.color,
                        backgroundColor: cvTier.bgColor ?? 'rgba(0,0,0,0.80)',
                      }}
                    >
                      <span className="text-xs font-bold leading-tight">{echoCV.toFixed(1)} CV</span>
                    </div>
                  </HoverCard>
                ) : <span />}

                {fetterIcon && (fetter ? (
                  <FetterHoverCard
                    fetter={fetter}
                    placement="top"
                    triggerClassName="pointer-events-auto inline-flex cursor-help"
                  >
                    <img
                      src={fetterIcon}
                      alt={fetter.name ? t(fetter.name) : (elementType ?? '')}
                      className="h-6 w-6 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                    />
                  </FetterHoverCard>
                ) : (
                  <img
                    src={fetterIcon}
                    alt={elementType ?? ''}
                    className="h-6 w-6 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                  />
                ))}
              </div>

              {/* Main stat heads the roll column; the five substats stay bottom-aligned. */}
              <div className="flex min-w-0 flex-col justify-between p-2">
                {mainStatType && mainStatValue != null && (
                  <HoverCard
                    placement="top"
                    width="sm"
                    triggerClassName="pointer-events-auto inline-flex max-w-full shrink-0 self-end cursor-help"
                    title={mainStatLabel || mainStatType}
                    subtitle="Echo main stat"
                    body={
                      mainStatRange ? (
                        <StatHoverRow label="Range">
                          {`${formatStatRoll(mainStatRange[0], isMainPercent)} – ${formatStatRoll(mainStatRange[1], isMainPercent)}`}
                        </StatHoverRow>
                      ) : (
                        <StatHoverRow label="Value">
                          {isMainPercent
                            ? `${mainStatValue.toFixed(1)}%`
                            : Math.round(mainStatValue).toLocaleString()}
                        </StatHoverRow>
                      )
                    }
                  >
                    <div
                      className={`flex max-w-full items-center gap-1 rounded-md border border-white/10 px-1.5 py-1 leading-none transition-all duration-200 ${mainPlateClassName}`}
                      style={mainVisuals.style}
                      onMouseEnter={() => onHoverStatChange?.(mainHoverKey)}
                      onMouseLeave={() => onHoverStatChange?.(null)}
                    >
                      {mainStatIcon && (
                        <img
                          src={mainStatIcon}
                          alt={mainStatType}
                          className={`h-4 w-4 shrink-0 object-contain ${mainVisuals.iconClassName}`}
                          style={mainStatIconFilter ? { filter: mainStatIconFilter } : undefined}
                        />
                      )}
                      <span className="inline-flex h-4 items-center whitespace-nowrap text-sm font-semibold leading-none tabular-nums text-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        {isMainPercent
                          ? `${mainStatValue.toFixed(1)}%`
                          : Math.round(mainStatValue).toLocaleString()}
                      </span>
                    </div>
                  </HoverCard>
                )}

                {Array.from({ length: 5 }).map((_, si) => {
                  const sub = substats[si];
                  if (!sub?.type || sub.value == null) {
                    return <div key={si} className="h-5 w-full" />;
                  }

                  const subType = sub.type.trim();
                  const subHoverKey = normalizeStatHoverKey(subType);

                  return (
                    <EchoSubstatChip
                      key={si}
                      statType={subType}
                      value={sub.value}
                      state={chipStateFor(subType, subHoverKey)}
                      showRollQuality={showRollQuality}
                      onHoverChange={(isHovering) => onHoverStatChange?.(isHovering ? subHoverKey : null)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
