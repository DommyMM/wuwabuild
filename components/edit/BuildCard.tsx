'use client';

import { forwardRef, useMemo, useState } from 'react';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateWeaponStats } from '@/lib/calculations/stats';
import { CharacterPanel } from '@/components/card/CharacterPanel';
import { SequenceStrip } from '@/components/card/SequenceStrip';
import { StatsTableSection } from '@/components/card/StatsTableSection';
import { ForteCardSection } from '@/components/card/ForteCardSection';
import { EchoSection } from '@/components/card/EchoSection';
import { ActiveSetsSection } from '@/components/card/ActiveSetsSection';
import { NameGroup } from '@/components/card/NameGroup';
import { WeaponGroup } from '@/components/card/WeaponGroup';
import { CardArtSourceMode, CardArtTransform } from '@/lib/cardArt';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';
import { ELEMENT_BLOOM, ELEMENT_TINT } from '@/lib/elementVisuals';

interface BuildCardProps {
  useAltSkin?: boolean;
  showCV?: boolean;
  showRollQuality?: boolean;
  artTransform: CardArtTransform;
  artSourceMode: CardArtSourceMode;
  customArtUrl: string | null;
  isArtEditMode: boolean;
  onCustomArtUpload: (file: File) => void;
  onArtTransformChange: (next: CardArtTransform) => void;
}

const normalizeWeaponStatIconKey = (stat: string | null | undefined): string | null => {
  if (!stat) return null;

  const normalized = stat.replace(/\./g, '').trim();
  const alias: Record<string, string> = {
    ER: 'Energy Regen',
    EnergyEfficiency: 'Energy Regen',
    EnergyRecover: 'Energy Regen',
    'Energy Regen': 'Energy Regen',
    'Energy Regeneration': 'Energy Regen',
    Crit: 'Crit Rate',
    'Crit Rate': 'Crit Rate',
    'Crit DMG': 'Crit DMG',
    'Crit Damage': 'Crit DMG',
    LifeMax: 'HP',
    Hp: 'HP',
  };

  return alias[normalized] ?? normalized;
};

export const BuildCard = forwardRef<HTMLDivElement, BuildCardProps>(({
  useAltSkin = false,
  showCV = true,
  showRollQuality = true,
  artTransform,
  artSourceMode,
  customArtUrl,
  isArtEditMode,
  onCustomArtUpload,
  onArtTransformChange,
}, ref) => {
  const selected = useSelectedCharacter();
  const { state, setWatermark } = useBuild();
  const { getWeapon, levelCurves, statIcons } = useGameData();
  const [activeHoverStat, setActiveHoverStat] = useState<StatHoverKey | null>(null);

  const weapon = getWeapon(state.weaponId);
  const weaponStats = useMemo(
    () => weapon ? calculateWeaponStats(weapon, state.weaponLevel, levelCurves) : null,
    [weapon, state.weaponLevel, levelCurves]
  );

  const tintClass = selected?.element
    ? (ELEMENT_TINT[selected.element] ?? 'from-transparent via-transparent to-transparent')
    : 'from-transparent via-transparent to-transparent';
  const bloomClass = selected?.element ? (ELEMENT_BLOOM[selected.element] ?? '') : '';

  const weaponAtkIcon = statIcons?.['ATK'];
  const weaponMainIconKey = weapon
    ? (normalizeWeaponStatIconKey(weapon.main_stat)
      ?? normalizeWeaponStatIconKey(weapon.mainStatI18n?.en)
      ?? 'Energy Regen')
    : null;
  const weaponMainIcon = weaponMainIconKey ? statIcons?.[weaponMainIconKey] ?? statIcons?.['Energy Regen'] : null;
  const weaponAtkHoverKey = normalizeStatHoverKey('ATK');
  const weaponMainHoverKey = weapon
    ? (normalizeStatHoverKey(weapon.main_stat) ?? normalizeStatHoverKey(weapon.mainStatI18n?.en))
    : null;

  return (
    <div ref={ref} className="relative select-none overflow-visible">
      {selected && (
        <div className="font-plus-jakarta tracking-wide leading-none text-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
          <div className="relative overflow-hidden rounded-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')] aspect-[2.4/1]">
            {/* Background overlays inside the fixed-ratio frame */}
            <div className="pointer-events-none absolute inset-0 z-0">
              <div className="absolute inset-0 bg-black/10" />
              <div className={`absolute inset-0 bg-linear-to-b ${tintClass}`} />
              <div className={`absolute inset-0 mix-blend-screen ${bloomClass}`} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_35%,rgba(0,0,0,0.22)_100%)]" />
            </div>

            <div className="relative z-10 flex h-full">
              {/* Character portrait stays full-height as the left anchor */}
              <CharacterPanel
                selected={selected}
                tintClass={tintClass}
                username={state.watermark.username}
                uid={state.watermark.uid}
                artSource={state.watermark.artSource}
                onArtSourceChange={v => setWatermark({ artSource: v })}
                useAltSkin={useAltSkin}
                artTransform={artTransform}
                artSourceMode={artSourceMode}
                customArtUrl={customArtUrl}
                isArtEditMode={isArtEditMode}
                onCustomArtUpload={onCustomArtUpload}
                onArtTransformChange={onArtTransformChange}
              />

              {/* Right side: name/weapon/forte + stats + echoes */}
              <div className="flex flex-col w-full">
                <div className="flex">
                  <div className="flex w-120 shrink-0 flex-col pt-4 gap-1">
                    <div className="flex">
                      <SequenceStrip
                        chains={selected.character.chains ?? []}
                        sequence={state.sequence}
                        element={selected.element}
                      />
                      <div className="flex flex-1 flex-col space-y-2">
                        <NameGroup selected={selected} characterLevel={state.characterLevel} />

                        {weapon && weaponStats && (
                          <WeaponGroup
                            weapon={weapon}
                            weaponStats={weaponStats}
                            weaponLevel={state.weaponLevel}
                            weaponRank={state.weaponRank}
                            weaponAtkIcon={weaponAtkIcon}
                            weaponMainIcon={weaponMainIcon}
                            activeHoverStat={activeHoverStat}
                            onHoverStatChange={setActiveHoverStat}
                            weaponAtkHoverKey={weaponAtkHoverKey}
                            weaponMainHoverKey={weaponMainHoverKey}
                          />
                        )}

                        <ForteCardSection
                          character={selected.character}
                          forte={state.forte}
                          activeHoverStat={activeHoverStat}
                          onHoverStatChange={setActiveHoverStat}
                        />
                      </div>
                    </div>
                    <ActiveSetsSection showCV={showCV} />
                  </div>

                  <StatsTableSection
                    activeHoverStat={activeHoverStat}
                    onHoverStatChange={setActiveHoverStat}
                  />
                </div>

                {/* Echo cards inside the frame */}
                <EchoSection
                  echoPanels={state.echoPanels}
                  showCV={showCV}
                  showRollQuality={showRollQuality}
                  activeHoverStat={activeHoverStat}
                  onHoverStatChange={setActiveHoverStat}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

BuildCard.displayName = 'BuildCard';
