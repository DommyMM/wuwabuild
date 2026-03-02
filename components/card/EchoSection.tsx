'use client';

import React from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { calculateEchoCV } from '@/lib/calculations/cv';

interface EchoSectionProps {
  echoPanels: EchoPanelState[];
}

export const EchoSection: React.FC<EchoSectionProps> = ({ echoPanels }) => {
  const { getEcho, fettersByElement, statIcons } = useGameData();
  const { t } = useLanguage();

  return (
    <div className="flex w-full gap-2 px-3 pb-3">
      {echoPanels.map((panel, i) => {
        const echo = panel.id ? getEcho(panel.id) : null;

        if (!echo) {
          return (
            <div
              key={i}
              className="flex h-[120px] min-w-0 flex-1 items-center justify-center rounded-lg border border-white/12 bg-black/35 backdrop-blur-[3px]"
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

        const rawEchoCV = calculateEchoCV(panel);
        const critMainContribution =
          echo.cost === 4 && mainStatType && mainStatValue != null
            ? (mainStatType === 'Crit Rate'
              ? mainStatValue * 2
              : (mainStatType === 'Crit DMG' ? mainStatValue : 0))
            : 0;
        const echoCV = Math.max(0, rawEchoCV - critMainContribution);

        const substats = panel.stats.subStats.filter(
          (sub) => Boolean(sub.type?.trim()) && sub.value != null
        );

        return (
          <div
            key={i}
            className="relative h-[120px] min-w-0 flex-1 overflow-hidden rounded-lg border border-white/12 bg-black/42 shadow-[0_4px_12px_rgba(0,0,0,0.4)] backdrop-blur-[3px]"
          >
            <div className="absolute left-1.5 top-1.5 z-10 rounded-md border border-white/20 bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {echoCV.toFixed(1)} CV
            </div>

            {fetterIcon && (
              <img
                src={fetterIcon}
                alt={elementType ?? ''}
                className="absolute right-1.5 top-1.5 z-10 h-4.5 w-4.5 object-contain opacity-90"
              />
            )}

            <div className="flex h-full gap-1.5 px-1.5 pb-1.5 pt-6">
              <div className="relative w-[42%] shrink-0 overflow-hidden rounded-md border border-white/12 bg-black/30">
                <img
                  src={echo.iconUrl}
                  alt={echoName}
                  className="absolute inset-0 h-full w-full object-contain"
                />

                {mainStatType && mainStatValue != null && (
                  <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-sm bg-black/65 px-1.5 py-0.5">
                    {mainStatIcon && (
                      <img src={mainStatIcon} alt={mainStatType} className="h-3.5 w-3.5 shrink-0 object-contain" />
                    )}
                    <span className="text-[10px] font-semibold leading-none text-white">
                      {isMainPercent
                        ? `${mainStatValue.toFixed(1)}%`
                        : Math.round(mainStatValue).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-2 content-center gap-x-1.5 gap-y-1">
                {Array.from({ length: 5 }).map((_, si) => {
                  const sub = substats[si];
                  if (!sub?.type || sub.value == null) {
                    return <div key={si} className="h-4" />;
                  }

                  const subType = sub.type.trim();
                  const isSubPercent = isPercentStat(subType);
                  const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')];

                  return (
                    <div key={si} className="flex h-4 items-center gap-1">
                      {subIcon && (
                        <img src={subIcon} alt={subType} className="h-3.5 w-3.5 shrink-0 object-contain" />
                      )}
                      <span className="truncate text-[11px] font-semibold leading-none text-white">
                        {isSubPercent ? `${sub.value.toFixed(1)}%` : Math.round(sub.value)}
                      </span>
                    </div>
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
