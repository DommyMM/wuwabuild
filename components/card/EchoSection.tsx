'use client';

import React from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { calculateEchoSubstatCV, getEchoCVTierStyle } from '@/lib/calculations/cv';
import { getSubstatTierColor } from '@/lib/calculations/substatTiers';
import { getEchoPaths } from '@/lib/paths';

interface EchoSectionProps {
  echoPanels: EchoPanelState[];
  showCV?: boolean;
  showRollQuality?: boolean;
}

const ECHO_IMAGE_FADE_STYLE: React.CSSProperties = {
  maskImage: 'linear-gradient(90deg, #000 30%, transparent 90%)',
  WebkitMaskImage: 'linear-gradient(90deg, #000 30%, transparent 90%)',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskSize: '100% 100%',
  WebkitMaskSize: '100% 100%',
};

export const EchoSection: React.FC<EchoSectionProps> = ({ echoPanels, showCV = true, showRollQuality = true }) => {
  const { getEcho, fettersByElement, statIcons } = useGameData();
  const { t } = useLanguage();

  return (
    <div className="flex gap-2 h-full p-4">
      {/* Echo cards row */}
      {echoPanels.map((panel, i) => {
          const echo = panel.id ? getEcho(panel.id) : null;

          if (!echo) {
            return (
              <div
                key={i}
                className="relative flex h-full flex-1 items-center justify-center overflow-hidden rounded-2xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.03)_30%,rgba(0,0,0,0.42)_100%)] backdrop-blur-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_8px_16px_rgba(0,0,0,0.35)]"
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
              className="relative flex flex-1 rounded-xl border overflow-hidden border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.03)_30%,rgba(0,0,0,0.42)_100%)] backdrop-blur-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_8px_16px_rgba(0,0,0,0.38)]"
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
                <img
                  src={getEchoPaths(echo, panel.phantom)}
                  alt={echoName}
                  className="w-full h-auto"
                  style={ECHO_IMAGE_FADE_STYLE}
                />
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
                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/55 px-1.5 py-0.5">
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
                  const tierColor = showRollQuality ? getSubstatTierColor(subType, sub.value) : null;

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
  );
};
