'use client';

import React from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { calculateCV, calculateEchoSubstatCV } from '@/lib/calculations/cv';

interface EchoSectionProps {
  echoPanels: EchoPanelState[];
}

const ECHO_IMAGE_FADE_STYLE: React.CSSProperties = {
  maskImage: 'linear-gradient(90deg, #000 30%, transparent 90%)',
  WebkitMaskImage: 'linear-gradient(90deg, #000 30%, transparent 90%)',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskSize: '100% 100%',
  WebkitMaskSize: '100% 100%',
};

export const EchoSection: React.FC<EchoSectionProps> = ({ echoPanels }) => {
  const { getEcho, fettersByElement, statIcons } = useGameData();
  const { t } = useLanguage();

  const _totalCV = calculateCV(echoPanels);

  return (
    <div className="flex flex-1 gap-2 px-3 pb-3">
      {echoPanels.map((panel, i) => {
        const echo = panel.id ? getEcho(panel.id) : null;

        if (!echo) {
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,180,70,0.14)_0%,rgba(35,39,58,0.82)_28%,rgba(28,31,45,0.95)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_8px_16px_rgba(0,0,0,0.35)]"
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

        const substats = panel.stats.subStats.filter(
          (sub) => Boolean(sub.type?.trim()) && sub.value != null
        );

        const echoCV = calculateEchoSubstatCV(panel);

        return (
          <div
            key={i}
            className="relative flex flex-1 overflow-hidden rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,180,70,0.14)_0%,rgba(58,42,86,0.82)_28%,rgba(45,49,67,0.94)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_8px_16px_rgba(0,0,0,0.38)]"
          >
            {/* Left: image at natural aspect ratio, stats pushed to bottom */}
            <div className="flex w-3/5 flex-col overflow-hidden">
              <img
                src={echo.iconUrl}
                alt={echoName}
                className="block w-full h-auto"
                style={ECHO_IMAGE_FADE_STYLE}
              />
              <div className="mt-auto flex flex-col items-start pb-4">
                {fetterIcon && (
                  <img
                    src={fetterIcon}
                    alt={elementType ?? ''}
                    className="h-5 w-5 object-contain"
                  />
                )}
                {mainStatType && mainStatValue != null && (
                  <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/68 px-1.5 py-1">
                    {mainStatIcon && (
                      <img src={mainStatIcon} alt={mainStatType} className="h-3.5 w-3.5 object-contain" />
                    )}
                    <span className="text-xs font-semibold">
                      {isMainPercent
                        ? `${mainStatValue.toFixed(1)}%`
                        : Math.round(mainStatValue).toLocaleString()}
                    </span>
                  </div>
                )}
                {echoCV > 0 && (
                  <span className="text-xs font-semibold leading-none text-white/70">
                    {echoCV.toFixed(1)} CV
                  </span>
                )}
              </div>
            </div>

            {/* Right: substats */}
            <div className="flex flex-col items-start justify-between py-4 -ml-1.5">
              {Array.from({ length: 5 }).map((_, si) => {
                const sub = substats[si];
                if (!sub?.type || sub.value == null) {
                  return <div key={si} className="h-5" />;
                }

                const subType = sub.type.trim();
                const isSubPercent = isPercentStat(subType);
                const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')];

                return (
                  <div key={si} className="flex items-center gap-1">
                    {subIcon && (
                      <img src={subIcon} alt={subType} className="h-4.5 w-4.5 object-contain" />
                    )}
                    <span className="text-base leading-none font-semibold">
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
