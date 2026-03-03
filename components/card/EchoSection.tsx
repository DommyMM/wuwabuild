'use client';

import React from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { calculateEchoSubstatCV, getEchoCVTierStyle } from '@/lib/calculations/cv';
import { getSubstatTierColor } from '@/lib/calculations/substatTiers';

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

  return (
    <div className="flex flex-col gap-2 px-4 relative z-10 -mt-38 ml-auto w-7/10">
      {/* Echo cards row */}
      <div className="flex gap-2 flex-1">
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
          const cvTier = echoCV > 0 ? getEchoCVTierStyle(echoCV) : null;

          return (
            <div
              key={i}
              className="relative flex flex-1 rounded-xl border overflow-hidden border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,180,70,0.14)_0%,rgba(58,42,86,0.82)_28%,rgba(45,49,67,0.94)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_8px_16px_rgba(0,0,0,0.38)]"
            >
              {cvTier && (
                <div
                  className="absolute top-1 left-1 z-10 flex items-center rounded-md border px-2 py-1"
                  style={{
                    borderColor: `${cvTier.color}66`,
                    color: cvTier.color,
                    backgroundColor: cvTier.bgColor ?? 'rgba(0,0,0,0.80)',
                  }}
                >
                  <span className="text-xs font-bold leading-none">{echoCV.toFixed(1)} CV</span>
                </div>
              )}
              {/* Echo image and misc */}
              <div className="flex w-3/5 flex-col overflow-hidden">
                <img
                  src={echo.iconUrl}
                  alt={echoName}
                  className="w-full h-auto"
                style={ECHO_IMAGE_FADE_STYLE}
                />
                <div className="flex flex-col items-start p-2 gap-1">
                  {fetterIcon && (
                    <img src={fetterIcon} alt={elementType ?? ''} className="h-5.5 w-5.5 object-contain" />
                  )}
                  {mainStatType && mainStatValue != null && (
                    <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/68 p-1">
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
              <div className="flex flex-col items-start justify-between py-4 -ml-2">
                {Array.from({ length: 5 }).map((_, si) => {
                  const sub = substats[si];
                  if (!sub?.type || sub.value == null) {
                    return <div key={si} className="h-5" />;
                  }

                  const subType = sub.type.trim();
                  const isSubPercent = isPercentStat(subType);
                  const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')];
                  const tierColor = getSubstatTierColor(subType, sub.value);

                  return (
                    <div
                      key={si}
                      className="flex items-center gap-1 rounded-sm px-1 py-0.5"
                      style={tierColor ? {
                        backgroundColor: `${tierColor}18`,
                        borderBottom: `1px solid ${tierColor}80`,
                      } : undefined}
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
    </div>
  );
};
