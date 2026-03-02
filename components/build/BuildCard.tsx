'use client';

import { forwardRef, useMemo } from 'react';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateWeaponStats } from '@/lib/calculations/stats';
import { CharacterPanel } from './CharacterPanel';
import { SequenceStrip } from './SequenceStrip';
import { StatsTableSection } from './StatsTableSection';
import { ForteCardSection } from './ForteCardSection';
import { EchoesRowSection } from './EchoesRowSection';

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

interface BuildCardProps { useAltSkin?: boolean; }

export const BuildCard = forwardRef<HTMLDivElement, BuildCardProps>(({ useAltSkin = false }, ref) => {
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
  const weaponMainIcon = weapon
    ? (statIcons?.[weapon.main_stat] ?? statIcons?.['Energy Regen'])
    : null;

  return (
    <div ref={ref} className="relative flex flex-col select-none">
      {selected && (
        <>
          {/* Main background */}
          <div
            className={"relative flex overflow-hidden rounded-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')]"}
            style={{ aspectRatio: '2.4/1' }}
          >
            {/* Background overlays inside card only */}
            <div className="pointer-events-none absolute inset-0 z-0">
              <div className="absolute inset-0 bg-black/10" />
              <div className={`absolute inset-0 bg-linear-to-b ${tintClass}`} />
              <div className={`absolute inset-0 mix-blend-screen ${bloomClass}`} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_35%,rgba(0,0,0,0.22)_100%)]" />
            </div>
            {/* Character portrait */}
            <CharacterPanel
              selected={selected}
              tintClass={tintClass}
              artSource={state.watermark.artSource}
              onArtSourceChange={v => setWatermark({ artSource: v })}
              useAltSkin={useAltSkin}
            />

            {/* Sequence strip */}
            <SequenceStrip
              chains={selected.character.chains ?? []}
              sequence={state.sequence}
              element={selected.element}
            />

            {/* Right content: [name+weapon+forte column] | [stats] */}
            <div className="relative flex font-plus-jakarta">
              <div className="flex flex-col">
                {/* 1. Name group */}
                <div className="flex flex-col py-4">
                  <div className="flex items-center">
                    {selected.character.elementIcon && (
                      <img src={selected.character.elementIcon} alt={selected.element} className="h-8 w-8 object-contain" />
                    )}
                    <span className="text-white text-4xl leading-none tracking-wide text-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                      {selected.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-0.5">
                    <span className="text-white/50 text-[10px] leading-none">
                      Lv.{state.characterLevel}/90
                    </span>
                  </div>
                </div>

                {/* 2. Weapon group */}
                {weapon && weaponStats && (
                  <div className="mt-1 flex w-[min(100%,22rem)] items-center gap-3 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                    <img
                      src={weapon.iconUrl}
                      alt={weapon.name}
                      className="h-14 w-14 object-contain shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate pr-1 text-[14px] font-semibold leading-tight text-white/95">
                        {weapon.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-4 w-4 object-contain" />}
                          <span className="text-[12px] font-medium text-white/85">{weaponStats.scaledAtk}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {weaponMainIcon && <img src={weaponMainIcon} alt={weapon.main_stat} className="h-4 w-4 object-contain" />}
                          <span className="text-[12px] font-medium text-white/85">{weaponStats.scaledMainStat}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-white/20 bg-black/40 px-2 py-0.5 text-[11px] font-medium leading-none text-white/70">
                          Lv.{state.weaponLevel}
                        </span>
                        <span className="rounded-md border border-white/25 bg-black/40 px-2 py-0.5 text-[11px] font-semibold leading-none text-white/80">
                          R{state.weaponRank}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Forte group */}
                <div className="flex flex-col min-w-0">
                  <div className="text-[8px] text-white/35 uppercase tracking-widest mb-1.5 text-center">Forte</div>
                  <ForteCardSection
                    character={selected.character}
                    forte={state.forte}
                    element={selected.element}
                  />
                </div>
              </div>

              {/* 4. Stats panel */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <StatsTableSection />
              </div>
            </div>
          </div>

          {/* Echoes */}
          <EchoesRowSection echoPanels={state.echoPanels} />
        </>
      )}
    </div>
  );
});

BuildCard.displayName = 'BuildCard';
