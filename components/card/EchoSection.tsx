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
        const rawColor = fetter?.color ? fetter.color.substring(0, 6) : 'ffffff';
        const setColor = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
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
              <div className="relative w-2/3 aspect-square shrink-0 overflow-hidden">
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

              {/* Info Column: Element Icon, Level, Main Stat */}
              <div className="flex flex-col items-center justify-evenly flex-1 py-2">
                {fetterIcon && (
                  <img
                    src={fetterIcon}
                    alt={elementType ?? ''}
                    className="w-7 h-7 object-contain drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]"
                  />
                )}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md leading-none"
                  style={{ backgroundColor: `${setColor}60`, color: 'rgba(255,255,255,0.95)' }}
                >
                  +{panel.level}
                </span>
                {mainStatType && mainStatValue != null && (
                  <div className="flex flex-col items-center gap-1">
                    {mainStatIcon && (
                      <img src={mainStatIcon} alt={mainStatType} className="h-5 w-5 object-contain" />
                    )}
                    <span className="text-white/95 text-[12px] font-bold leading-none text-center">
                      {isMainPercent
                        ? `${mainStatValue.toFixed(1)}%`
                        : Math.round(mainStatValue).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Substats */}
            <div className="flex flex-col gap-1 px-2 pt-1 pb-2 flex-1">
              {panel.stats.subStats.map((sub, si) => {
                const subType = sub.type?.trim() || null;
                if (!subType || sub.value == null) {
                  return <div key={si} className="h-4" />;
                }
                const isSubPercent = isPercentStat(subType);
                const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')];
                const translated = statTranslations?.[subType] ? t(statTranslations[subType]) : subType;
                const subLabel = getEchoSubstatShortLabel(translated);
                return (
                  <div key={si} className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      {subIcon && (
                        <img src={subIcon} alt={subType} className="h-3.5 w-3.5 object-contain shrink-0" />
                      )}
                      <span className="text-white/55 text-[10px] leading-none truncate">
                        {subLabel}
                      </span>
                    </div>
                    <span className="text-white/90 text-[10px] font-semibold leading-none shrink-0">
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
