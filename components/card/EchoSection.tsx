'use client';

import React from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { getEchoSubstatShortLabel, normalizeEchoStatName } from '@/lib/echoStatLabels';

interface EchoSectionProps {
  echoPanels: EchoPanelState[];
}

export const EchoSection: React.FC<EchoSectionProps> = ({ echoPanels }) => {
  const { getEcho, fettersByElement, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();

  return (
    <div className="flex w-full gap-2 pl-8">
      {echoPanels.map((panel, i) => {
        const echo = panel.id ? getEcho(panel.id) : null;

        if (!echo) {
          return (
            <div
              key={i}
              className="flex-1 flex items-center justify-center rounded-xl border border-white/8 bg-white/3 min-h-[200px]"
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

        const mainStatType = normalizeEchoStatName(panel.stats.mainStat.type);
        const mainStatValue = panel.stats.mainStat.value;
        const mainStatIcon = mainStatType
          ? (statIcons?.[mainStatType] ?? statIcons?.[mainStatType.replace('%', '')])
          : null;
        const isMainPercent = mainStatType ? isPercentStat(mainStatType) : false;

        return (
          <div
            key={i}
            className="flex-1 flex flex-col rounded-xl overflow-hidden border min-w-0"
            style={{
              borderColor: `${setColor}45`,
              backgroundColor: `${setColor}0A`,
              boxShadow: `0 -6px 20px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Set-colored top accent bar */}
            <div className="h-1 w-full shrink-0" style={{ backgroundColor: setColor }} />

            {/* Echo icon with level + set element badges */}
            <div className="relative flex items-center justify-center pt-3 pb-1 shrink-0">
              <img
                src={echo.iconUrl}
                alt={echoName}
                className="w-16 h-16 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              />
              {/* Level badge — bottom-right corner of icon */}
              <span
                className="absolute bottom-1 right-2 text-[9px] font-bold px-1.5 py-px rounded-md leading-none"
                style={{ backgroundColor: `${setColor}70`, color: 'rgba(255,255,255,0.95)' }}
              >
                +{panel.level}
              </span>
              {/* Set element icon — top-right corner */}
              {fetterIcon && (
                <img
                  src={fetterIcon}
                  alt={elementType ?? ''}
                  className="absolute top-0 right-1 w-5 h-5 object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                />
              )}
            </div>

            {/* Main stat: icon + value only (NO type label) */}
            {mainStatType && mainStatValue != null && (
              <div className="flex items-center justify-center gap-1.5 px-2 pb-2 shrink-0">
                {mainStatIcon && (
                  <img src={mainStatIcon} alt={mainStatType} className="h-5 w-5 object-contain shrink-0" />
                )}
                <span className="text-white/95 text-lg font-bold leading-none">
                  {isMainPercent
                    ? `${mainStatValue.toFixed(1)}%`
                    : Math.round(mainStatValue).toLocaleString()}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="mx-2 h-px bg-white/12 shrink-0" />

            {/* Substats — full names, readable size */}
            <div className="flex flex-col gap-1 px-2 pt-2 pb-2 flex-1">
              {panel.stats.subStats.map((sub, si) => {
                const subType = normalizeEchoStatName(sub.type);
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
