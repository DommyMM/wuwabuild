'use client';

import React from 'react';
import { EchoPanelState } from '@/lib/echo';
import { useGameData } from '@/contexts/GameDataContext';

const PERCENT_STATS = new Set([
  'Crit Rate', 'Crit DMG', 'Energy Regen', 'HP%', 'ATK%', 'DEF%',
  'Aero DMG', 'Glacio DMG', 'Fusion DMG', 'Electro DMG', 'Havoc DMG', 'Spectro DMG',
  'Basic Attack DMG Bonus', 'Heavy Attack DMG Bonus',
  'Resonance Skill DMG Bonus', 'Resonance Liberation DMG Bonus', 'Healing Bonus',
]);

const SHORT: Record<string, string> = {
  'HP': 'HP', 'HP%': 'HP%', 'ATK': 'ATK', 'ATK%': 'ATK%', 'DEF': 'DEF', 'DEF%': 'DEF%',
  'Crit Rate': 'CR', 'Crit DMG': 'CD', 'Energy Regen': 'ER',
  'Basic Attack DMG Bonus': 'Basic ATK', 'Heavy Attack DMG Bonus': 'Heavy ATK',
  'Resonance Skill DMG Bonus': 'Res. Skill', 'Resonance Liberation DMG Bonus': 'Res. Lib.',
  'Healing Bonus': 'Healing', 'Aero DMG': 'Aero', 'Glacio DMG': 'Glacio',
  'Fusion DMG': 'Fusion', 'Electro DMG': 'Electro', 'Havoc DMG': 'Havoc', 'Spectro DMG': 'Spectro',
};

const MAIN_SHORT: Record<string, string> = {
  'HP': 'HP', 'ATK': 'ATK', 'DEF': 'DEF', 'HP%': 'HP%', 'ATK%': 'ATK%', 'DEF%': 'DEF%',
  'Crit Rate': 'CR', 'Crit DMG': 'CD', 'Energy Regen': 'ER',
  'Basic Attack DMG Bonus': 'Basic ATK', 'Heavy Attack DMG Bonus': 'Heavy ATK',
  'Resonance Skill DMG Bonus': 'Res. Skill', 'Resonance Liberation DMG Bonus': 'Res. Lib.',
  'Healing Bonus': 'Healing', 'Aero DMG': 'Aero DMG', 'Glacio DMG': 'Glacio DMG',
  'Fusion DMG': 'Fusion DMG', 'Electro DMG': 'Electro DMG', 'Havoc DMG': 'Havoc DMG',
  'Spectro DMG': 'Spectro DMG',
};

interface EchoesRowSectionProps {
  echoPanels: EchoPanelState[];
  className?: string;
}

export const EchoesRowSection: React.FC<EchoesRowSectionProps> = ({ echoPanels, className = '' }) => {
  const { getEcho, fettersByElement, statIcons } = useGameData();

  return (
    <div className={`flex gap-1.5 ${className}`}>
      {echoPanels.map((panel, i) => {
        const echo = panel.id ? getEcho(panel.id) : null;

        if (!echo) {
          return (
            <div key={i} className="flex-1 rounded-lg border border-white/8 bg-white/3 flex items-center justify-center min-h-0">
              <div className="w-5 h-5 rounded-full border-2 border-white/15 border-dashed" />
            </div>
          );
        }

        const elementType = echo.elements.length === 1 ? echo.elements[0] : panel.selectedElement;
        const fetter = elementType ? fettersByElement[elementType] : null;
        const rawColor = fetter?.color ?? 'ffffff';
        const setColor = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;

        const mainStatType = panel.stats.mainStat.type;
        const mainStatValue = panel.stats.mainStat.value;
        const mainStatIcon = mainStatType ? (statIcons?.[mainStatType] ?? statIcons?.[mainStatType.replace('%', '')]) : null;
        const isMainPercent = mainStatType ? PERCENT_STATS.has(mainStatType) : false;

        return (
          <div
            key={i}
            className="flex-1 flex flex-col rounded-lg overflow-hidden border min-w-0"
            style={{ borderColor: `${setColor}50`, backgroundColor: `${setColor}0C` }}
          >
            {/* Set color top bar */}
            <div className="h-0.5 w-full shrink-0" style={{ backgroundColor: setColor }} />

            {/* Echo icon + level badge */}
            <div className="relative flex items-center justify-center py-1 shrink-0">
              <img
                src={echo.iconUrl}
                alt={echo.name}
                className="w-9 h-9 object-contain"
              />
              <span
                className="absolute bottom-0.5 right-0.5 text-[7px] font-bold px-1 py-px rounded leading-none"
                style={{ backgroundColor: `${setColor}60`, color: 'rgba(255,255,255,0.9)' }}
              >
                +{panel.level}
              </span>
            </div>

            {/* Main stat */}
            {mainStatType && mainStatValue != null && (
              <div className="flex items-center justify-center gap-0.5 px-1 pb-0.5 shrink-0">
                {mainStatIcon && <img src={mainStatIcon} alt={mainStatType} className="h-3 w-3 object-contain shrink-0" />}
                <span className="text-white/90 text-[9px] font-semibold leading-none truncate">
                  {isMainPercent
                    ? `${mainStatValue.toFixed(1)}%`
                    : Math.round(mainStatValue).toLocaleString()}
                </span>
              </div>
            )}
            {mainStatType && (
              <div className="text-center text-[7px] text-white/45 leading-none px-1 pb-0.5 truncate shrink-0">
                {MAIN_SHORT[mainStatType] ?? mainStatType}
              </div>
            )}

            {/* Divider */}
            <div className="mx-1 h-px bg-white/10 shrink-0" />

            {/* Substats */}
            <div className="flex flex-col gap-px px-1 pt-0.5 pb-1 flex-1 justify-start">
              {panel.stats.subStats.map((sub, si) => {
                if (!sub.type || sub.value == null) {
                  return <div key={si} className="h-3" />;
                }
                const isSubPercent = PERCENT_STATS.has(sub.type);
                const subIcon = statIcons?.[sub.type] ?? statIcons?.[sub.type.replace('%', '')];
                return (
                  <div key={si} className="flex items-center justify-between gap-0.5">
                    <div className="flex items-center gap-0.5 min-w-0">
                      {subIcon && <img src={subIcon} alt={sub.type} className="h-2.5 w-2.5 object-contain shrink-0" />}
                      <span className="text-white/50 text-[7px] leading-none truncate">
                        {SHORT[sub.type] ?? sub.type}
                      </span>
                    </div>
                    <span className="text-white/85 text-[7px] font-medium leading-none shrink-0">
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
