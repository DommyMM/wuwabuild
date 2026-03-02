'use client';

import React from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';

interface EchoSectionProps {
  echoPanels: EchoPanelState[];
}

export const EchoSection: React.FC<EchoSectionProps> = ({ echoPanels }) => {
  const { getEcho, fettersByElement, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();

  return (
    <div className="flex w-full p-4 gap-3">
      {echoPanels.map((panel, i) => {
        const echo = panel.id ? getEcho(panel.id) : null;

        if (!echo) {
          return (
            <div
              key={i}
              className="flex-1 flex items-center justify-center min-h-[200px] rounded-lg bg-black/25 backdrop-blur-[3px] border border-white/8 shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
            >
              <div className="w-8 h-8 rounded-full border-2 border-white/15 border-dashed" />
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

        return (
          <div
            key={i}
            className="flex-1 flex flex-col overflow-hidden min-w-0 rounded-lg bg-black/25 backdrop-blur-[3px] border border-white/8 shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
          >
            {/* Echo Image + Info Column */}
            <div className="flex shrink-0 items-stretch">
              {/* Echo image — forced square, fades right into info column */}
              <div className="relative aspect-square w-[62%] shrink-0 overflow-hidden">
                <img
                  src={echo.iconUrl}
                  alt={echoName}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{
                    maskImage: 'linear-gradient(to right, black 65%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, black 65%, transparent 100%)',
                  }}
                />
              </div>

              {/* Info Column: Element Icon, Main Stat */}
              <div className="flex flex-1 flex-col items-center justify-start gap-2.5 pb-1 pt-2">
                {fetterIcon && (
                  <img
                    src={fetterIcon}
                    alt={elementType ?? ''}
                    className="w-7 h-7 object-contain drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]"
                  />
                )}
                {mainStatType && mainStatValue != null && (
                  <div className="flex flex-col items-center gap-1.5">
                    {mainStatIcon && (
                      <img src={mainStatIcon} alt={mainStatType} className="h-5 w-5 object-contain" />
                    )}
                    <span className="text-center text-[12px] font-medium leading-none text-white/95">
                      {isMainPercent
                        ? `${mainStatValue.toFixed(1)}%`
                        : Math.round(mainStatValue).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Substats */}
            <div className="flex flex-1 flex-col gap-1.5 px-1.5 pb-2 pt-1">
              {panel.stats.subStats.map((sub, si) => {
                const subType = sub.type?.trim() || null;
                if (!subType || sub.value == null) {
                  return <div key={si} className="h-5" />;
                }
                const isSubPercent = isPercentStat(subType);
                const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')];
                const translated = statTranslations?.[subType] ? t(statTranslations[subType]) : subType;
                const subLabel = getEchoSubstatShortLabel(translated);
                return (
                  <div key={si} className="flex items-center justify-between gap-1.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {subIcon && (
                        <img src={subIcon} alt={subType} className="h-[18px] w-[18px] shrink-0 object-contain" />
                      )}
                      <span className="truncate text-[11px] font-normal leading-none text-white/65">
                        {subLabel}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium leading-none text-white/90">
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
