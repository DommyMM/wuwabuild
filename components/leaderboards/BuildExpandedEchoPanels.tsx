'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateEchoSubstatCV, getEchoCVFrameColor, getEchoCVTierStyle, QUALITY_TIERS } from '@/lib/calculations/rollValues';
import { getSubstatTierInfo } from '@/lib/calculations/substatTiers';
import { isPercentStat } from '@/lib/constants/statMappings';
import { FORTE_LABELS } from '@/lib/constants/skillBranches';
import { Character } from '@/lib/character';
import { activeElementForPanel, Echo } from '@/lib/echo';
import { LBBuildDetailEntry } from '@/lib/lb';
import { getEchoPaths } from '@/lib/paths';
import { ECHO_IMAGE_FADE_STYLE } from '@/components/card/EchoSection';
import { EchoHoverCard } from '@/components/echo/EchoHoverCard';
import { FetterHoverCard } from '@/components/echo/FetterHoverCard';
import { HoverCard } from '@/components/ui/HoverCard';
import { RegionBadge } from './constants';

interface BuildExpandedEchoPanelsProps {
  detail: LBBuildDetailEntry;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
  statIcons: Record<string, string> | null;
  getEcho: (id: string | null) => Echo | null;
  translateText: (i18n: Record<string, string> | undefined, fallback: string) => string;
  activeSelectedSubstats: ReadonlySet<string>;
  hasSelectedSubstats: boolean;
  showHeader?: boolean;
  showForte?: boolean;
}

function normalizeSubstatKey(type: string | null | undefined): string | null {
  if (!type) return null;
  const trimmed = type.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatStatRoll(value: number, isPercent: boolean): string {
  return isPercent ? `${Number(value).toFixed(1)}%` : String(Math.round(Number(value)));
}

// A label/value pair used inside hover tooltip bodies on the echo panels.
const StatHoverRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-xs font-semibold uppercase tracking-wide text-white/55">{label}</span>
    <span className="text-sm font-semibold text-white/90">{children}</span>
  </div>
);

// Discrete bar of every possible roll for a substat, tinted by quality tier.
// The roll this build landed is enlarged, brightened and labelled.
export const SubstatRollBar: React.FC<{
  rollValues: number[];
  currentValue: number;
  isPercent: boolean;
}> = ({ rollValues, currentValue, isPercent }) => {
  const sorted = rollValues.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b);
  if (sorted.length < 2) {
    return <span className="text-sm font-semibold text-white/90">{formatStatRoll(currentValue, isPercent)}</span>;
  }

  let currentIndex = 0;
  let bestDelta = Infinity;
  sorted.forEach((value, index) => {
    const delta = Math.abs(value - currentValue);
    if (delta < bestDelta) {
      bestDelta = delta;
      currentIndex = index;
    }
  });

  const tierColors = sorted.map((value) => getSubstatTierInfo(value, sorted)?.color ?? '#888888');
  const currentColor = tierColors[currentIndex];

  return (
    <div>
      <div className="flex items-end gap-0.5">
        {sorted.map((value, index) => (
          <span
            key={index}
            className="min-w-0 flex-1 text-center text-xs font-bold leading-none tabular-nums"
            style={{ color: index === currentIndex ? currentColor : 'transparent' }}
          >
            {formatStatRoll(value, isPercent)}
          </span>
        ))}
      </div>
      <div className="mt-1 flex items-end gap-0.5">
        {sorted.map((value, index) => {
          const isCurrent = index === currentIndex;
          return (
            <div
              key={index}
              className="min-w-0 flex-1 rounded-[2px]"
              style={{
                backgroundColor: tierColors[index],
                height: isCurrent ? 18 : 7,
                opacity: isCurrent ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// A value plotted on the shared quality-tier ladder; the landed tier is enlarged.
// CV and RV both grade on QUALITY_TIERS, so the ladder only needs the tier label.
export const QualityTierBar: React.FC<{ currentLabel: string; valueText: string }> = ({ currentLabel, valueText }) => {
  const tiers = QUALITY_TIERS.slice().reverse(); // low -> high
  const currentIndex = tiers.findIndex((tier) => tier.label === currentLabel);

  return (
    <div>
      <div className="flex items-end gap-0.5">
        {tiers.map((tier, index) => (
          <span
            key={tier.label}
            className="min-w-0 flex-1 text-center text-xs font-bold leading-none tabular-nums"
            style={{ color: index === currentIndex ? tier.color : 'transparent' }}
          >
            {valueText}
          </span>
        ))}
      </div>
      <div className="mt-1 flex items-end gap-0.5">
        {tiers.map((tier, index) => {
          const isCurrent = index === currentIndex;
          return (
            <div
              key={tier.label}
              className="min-w-0 flex-1 rounded-[2px]"
              style={{
                backgroundColor: tier.color,
                height: isCurrent ? 18 : 7,
                opacity: isCurrent ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Echo CV plotted on its quality-tier ladder; the build's tier is enlarged.
export const EchoCVBar: React.FC<{ cv: number }> = ({ cv }) => (
  <QualityTierBar currentLabel={getEchoCVTierStyle(cv).label} valueText={cv.toFixed(1)} />
);

export const BuildExpandedEchoPanels: React.FC<BuildExpandedEchoPanelsProps> = ({
  detail,
  character,
  characterName,
  regionBadge,
  statIcons,
  getEcho,
  translateText,
  activeSelectedSubstats,
  hasSelectedSubstats,
  showHeader = true,
  showForte = true,
}) => {
  const { fettersByElement, getSubstatValues, getMainStatsByCost, statTranslations } = useGameData();

  return (
    <>
      {showHeader && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {character?.head ? (
              <img src={character.head} alt={characterName} className="h-9 w-9 object-cover" />
            ) : (
              <div className="h-9 w-9 rounded bg-border" />
            )}
            <div className="text-base font-medium text-text-primary">
              {characterName} Lv.{detail.buildState.characterLevel}
            </div>
          </div>

          {showForte && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {FORTE_LABELS.map((label, forteIndex) => {
                const entryForte = detail.buildState.forte?.[forteIndex];
                const level = Number(entryForte?.[0] ?? 1);
                return (
                  <span
                    key={`${detail.id}-forte-${label}`}
                    className="rounded border border-border bg-background-secondary px-2 py-1 text-[11px] font-semibold text-text-primary/85"
                  >
                    {label} {level}
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-1 text-sm text-text-primary/70">
            <span>{detail.owner.username || 'Anonymous'}</span>
            <span>-</span>
            <span>{detail.owner.uid || '-'}</span>
            {regionBadge && (
              <>
                <span>-</span>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold tracking-wide ${regionBadge.className}`}>
                  {regionBadge.label}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 min-w-0">
        {detail.buildState.echoPanels.map((panel, panelIndex) => {
          const echo = panel.id ? getEcho(panel.id) : null;
          const echoName = echo
            ? translateText(echo.nameI18n as Record<string, string> | undefined, echo.name)
            : 'Empty Slot';
          const mainStatType = normalizeSubstatKey(panel.stats.mainStat.type);
          const mainStatValue = panel.stats.mainStat.value;
          const mainStatIcon = mainStatType
            ? (statIcons?.[mainStatType] ?? statIcons?.[mainStatType.replace('%', '')] ?? '')
            : '';
          const isMainPercent = mainStatType ? isPercentStat(mainStatType) : false;
          const mainStatLabel = mainStatType
            ? (statTranslations?.[mainStatType]
                ? translateText(statTranslations[mainStatType], mainStatType)
                : mainStatType)
            : '';
          const mainStatRange: [number, number] | null = mainStatType
            ? (getMainStatsByCost(echo?.cost ?? null)[mainStatType] ?? null)
            : null;

          const panelSubstats = panel.stats.subStats.filter((sub) => {
            const key = normalizeSubstatKey(sub.type);
            return Boolean(key && sub.value !== null);
          });

          const elementType = echo ? activeElementForPanel(panel, echo) : null;
          const fetter = elementType ? fettersByElement[elementType] : null;
          const fetterIcon = fetter?.icon ?? fetter?.fetterIcon ?? null;

          const echoCV = calculateEchoSubstatCV(panel);
          const cvTier = echoCV > 0 ? getEchoCVTierStyle(echoCV) : null;
          const frameBorderColor = getEchoCVFrameColor(echoCV);

          if (!echo) {
            return (
              <div
                key={`${detail.id}-panel-empty-${panelIndex}`}
                className="relative flex min-w-0 items-center justify-center aspect-6/5 rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)]"
              >
                <div className="h-7 w-7 rounded-full border-2 border-dashed border-white/20" />
              </div>
            );
          }

          return (
            <div
              key={`${detail.id}-panel-${panel.id ?? 'empty'}-${panelIndex}`}
              className="relative min-w-0 aspect-6/5 rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)] transition-all duration-200"
              style={{ borderColor: `${frameBorderColor}b3` }}
            >
              {fetterIcon && (
                <div className="absolute top-0 left-1/2 z-3 -translate-x-1/2 -translate-y-1/2">
                  {fetter ? (
                    <FetterHoverCard
                      fetter={fetter}
                      placement="top"
                      triggerClassName="inline-flex cursor-pointer"
                    >
                      <img
                        src={fetterIcon}
                        alt={translateText(fetter.name as unknown as Record<string, string> | undefined, elementType ?? '')}
                        className="h-6 w-6 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
                      />
                    </FetterHoverCard>
                  ) : (
                    <img
                      src={fetterIcon}
                      alt={elementType ?? ''}
                      className="h-6 w-6 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
                    />
                  )}
                </div>
              )}

              <img
                src={getEchoPaths(echo, panel.phantom)}
                alt={echoName}
                className="absolute h-full object-cover transition-all duration-200 rounded-xl"
                style={ECHO_IMAGE_FADE_STYLE}
              />

              {/* Echo identity hover sits beneath the content layer, covers the artwork half. */}
              <EchoHoverCard echo={echo} resolvedFetter={fetter} placement="top" triggerClassName="absolute inset-y-0 left-0 z-1 w-1/2">
                <span aria-hidden className="block h-full w-full" />
              </EchoHoverCard>

              {/* Content layer is click-through so the echo hover behind it stays reachable;
                  individual chips re-enable pointer events. */}
              <div className="pointer-events-none relative z-2 flex h-full">
                <div className="flex w-1/2 flex-col items-start justify-between p-2">
                  <div className="flex flex-col items-start gap-1">
                    {cvTier && (
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
                    )}
                  </div>

                  {mainStatType && mainStatValue != null && (
                    <HoverCard
                      placement="right"
                      width="sm"
                      triggerClassName="pointer-events-auto inline-flex"
                      title={mainStatLabel || mainStatType}
                      subtitle="Echo main stat"
                      body={(
                        mainStatRange ? (
                          <StatHoverRow label="Range">
                            {`${formatStatRoll(mainStatRange[0], isMainPercent)} – ${formatStatRoll(mainStatRange[1], isMainPercent)}`}
                          </StatHoverRow>
                        ) : (
                          <StatHoverRow label="Value">
                            {isMainPercent
                              ? `${Number(mainStatValue).toFixed(1)}%`
                              : Math.round(Number(mainStatValue)).toLocaleString()}
                          </StatHoverRow>
                        )
                      )}
                    >
                      <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/75 px-2 py-1">
                        {mainStatIcon ? (
                          <img src={mainStatIcon} alt="" className="h-5 w-5 object-contain" />
                        ) : (
                          <span className="h-5 w-5 rounded bg-white/18" />
                        )}
                        <span className="text-base font-semibold">
                          {isMainPercent
                            ? `${Number(mainStatValue).toFixed(1)}%`
                            : Math.round(Number(mainStatValue)).toLocaleString()}
                        </span>
                      </div>
                    </HoverCard>
                  )}
                </div>

                <div className="flex w-1/2 flex-col items-stretch justify-center gap-1 py-2.5 pl-8 pr-2">
                  {Array.from({ length: 5 }).map((_, subIndex) => {
                    const sub = panelSubstats[subIndex];
                    if (!sub?.type || sub.value === null) {
                      return <div key={`${detail.id}-empty-sub-${panelIndex}-${subIndex}`} className="h-8 w-full" />;
                    }

                    const subType = normalizeSubstatKey(sub.type) ?? '';
                    const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')] ?? '';
                    const isSubPercent = isPercentStat(subType);
                    const subRollValues = getSubstatValues(subType);
                    const tierInfo = getSubstatTierInfo(Number(sub.value), subRollValues);
                    const isMatchedSelection = hasSelectedSubstats && activeSelectedSubstats.has(subType);
                    const isDimmed = hasSelectedSubstats && !isMatchedSelection;

                    const tierStyle: React.CSSProperties | undefined = tierInfo ? {
                      color: tierInfo.color,
                    } : undefined;

                    const selectedStyle: React.CSSProperties | undefined = isMatchedSelection ? {
                      backgroundColor: 'rgba(255, 215, 0, 0.15)',
                      boxShadow: '0 0 2px rgba(255, 215, 0, 0.30)',
                    } : undefined;

                    const combinedStyle: React.CSSProperties = {
                      ...(tierStyle ?? {}),
                      ...(selectedStyle ?? {}),
                    };

                    const subLabel = statTranslations?.[subType]
                      ? translateText(statTranslations[subType], subType)
                      : subType;

                    return (
                      <HoverCard
                        key={`${detail.id}-sub-${panelIndex}-${subIndex}`}
                        placement="right"
                        width="md"
                        triggerClassName="pointer-events-auto block w-full cursor-pointer"
                        title={subLabel}
                        subtitle="Substat"
                        body={(
                          <SubstatRollBar
                            rollValues={subRollValues ?? []}
                            currentValue={Number(sub.value)}
                            isPercent={isSubPercent}
                          />
                        )}
                      >
                        <div
                          className={`flex w-full items-center gap-1 rounded-sm bg-black/40 px-1.5 py-1.5 text-base font-semibold leading-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-opacity duration-200 ${
                            isDimmed ? 'opacity-35' : 'opacity-100'
                          }`}
                          style={combinedStyle}
                        >
                          {subIcon ? (
                            <img src={subIcon} alt="" className={`h-4.5 w-4.5 object-contain ${isMatchedSelection ? 'brightness-125' : ''}`} />
                          ) : (
                            <span className="h-4 w-4 rounded bg-white/18" />
                          )}
                          <span>
                            {isSubPercent ? `${Number(sub.value).toFixed(1)}%` : Math.round(Number(sub.value))}
                          </span>
                        </div>
                      </HoverCard>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
