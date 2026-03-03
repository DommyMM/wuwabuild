'use client';

import { forwardRef, useMemo } from 'react';
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

const ELEMENT_TINT: Record<string, string> = {
  Aero: 'from-aero/24 via-aero/10 to-transparent',
  Havoc: 'from-havoc/28 via-havoc/12 to-transparent',
  Spectro: 'from-spectro/24 via-spectro/10 to-transparent',
  Glacio: 'from-glacio/22 via-glacio/9 to-transparent',
  Electro: 'from-electro/24 via-electro/10 to-transparent',
  Fusion: 'from-fusion/26 via-fusion/11 to-transparent',
};

const ELEMENT_BLOOM: Record<string, string> = {
  Aero: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(85,255,181,0.28)_0%,rgba(85,255,181,0.08)_40%,transparent_78%)]',
  Havoc: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(230,73,166,0.3)_0%,rgba(230,73,166,0.09)_40%,transparent_78%)]',
  Spectro: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(248,229,108,0.27)_0%,rgba(248,229,108,0.09)_40%,transparent_78%)]',
  Glacio: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(65,174,251,0.26)_0%,rgba(65,174,251,0.08)_40%,transparent_78%)]',
  Electro: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(180,107,255,0.28)_0%,rgba(180,107,255,0.09)_40%,transparent_78%)]',
  Fusion: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(240,116,78,0.28)_0%,rgba(240,116,78,0.09)_40%,transparent_78%)]',
};

interface BuildCardProps {
  useAltSkin?: boolean;
  showCV?: boolean;
  showRollQuality?: boolean;
  artTransform: CardArtTransform;
  artSourceMode: CardArtSourceMode;
  customArtUrl: string | null;
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
}, ref) => {
  const selected = useSelectedCharacter();
  const { state, setWatermark } = useBuild();
  const { getWeapon, levelCurves, statIcons } = useGameData();

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
                artSource={state.watermark.artSource}
                onArtSourceChange={v => setWatermark({ artSource: v })}
                useAltSkin={useAltSkin}
                artTransform={artTransform}
                artSourceMode={artSourceMode}
                customArtUrl={customArtUrl}
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
                          />
                        )}

                        <ForteCardSection
                          character={selected.character}
                          forte={state.forte}
                        />
                      </div>
                    </div>
                    <ActiveSetsSection showCV={showCV} />
                  </div>

                  <StatsTableSection />
                </div>

                {/* Echo cards inside the frame */}
                <EchoSection echoPanels={state.echoPanels} showCV={showCV} showRollQuality={showRollQuality} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

BuildCard.displayName = 'BuildCard';
