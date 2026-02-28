'use client';

import { forwardRef, useMemo } from 'react';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useStats } from '@/contexts/StatsContext';
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

const ELEMENT_COLOR: Record<string, string> = {
  Aero: '#55FFB5', Havoc: '#E649A6', Spectro: '#F8E56C',
  Glacio: '#41AEFB', Electro: '#B46BFF', Fusion: '#F0744E',
};

interface BuildCardProps { useAltSkin?: boolean; }

export const BuildCard = forwardRef<HTMLDivElement, BuildCardProps>(({ useAltSkin = false }, ref) => {
  const selected = useSelectedCharacter();
  const { state, setWatermark } = useBuild();
  const { getWeapon, levelCurves, statIcons } = useGameData();
  const { stats } = useStats();

  const weapon = getWeapon(state.weaponId);
  const weaponStats = useMemo(
    () => weapon ? calculateWeaponStats(weapon, state.weaponLevel, levelCurves) : null,
    [weapon, state.weaponLevel, levelCurves]
  );

  const tintClass = selected?.element
    ? (ELEMENT_TINT[selected.element] ?? 'from-transparent via-transparent to-transparent')
    : 'from-transparent via-transparent to-transparent';
  const bloomClass = selected?.element ? (ELEMENT_BLOOM[selected.element] ?? '') : '';
  const elementColor = selected?.element ? (ELEMENT_COLOR[selected.element] ?? '#ffffff80') : '#ffffff80';

  const weaponAtkIcon = statIcons?.['ATK'];
  const weaponMainIcon = weapon
    ? (statIcons?.[weapon.main_stat] ?? statIcons?.['Energy Regen'])
    : null;

  return (
    <div ref={ref} className="relative flex flex-col select-none">
      {selected && (
        <>
          {/* ── TOP: main card — background confined here ── */}
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

            {/* Right content */}
            <div className="relative flex flex-col flex-1 min-w-0 p-3 gap-2 z-10">
              {/* Header: name/level/CV | weapon */}
              <div className="flex items-start justify-between gap-3 shrink-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    {selected.character.elementIcon && (
                      <img src={selected.character.elementIcon} alt={selected.element} className="h-4 w-4 object-contain" />
                    )}
                    <span className="text-white/95 text-sm font-bold leading-none tracking-wide">
                      {selected.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-0.5">
                    <span className="text-white/50 text-[10px] leading-none">
                      Lv.{state.characterLevel}/90
                    </span>
                    <span
                      className="text-[10px] font-semibold leading-none px-1.5 py-px rounded"
                      style={{ color: elementColor, backgroundColor: `${elementColor}20`, border: `1px solid ${elementColor}40` }}
                    >
                      CV {stats.cv.toFixed(1)}
                    </span>
                  </div>
                </div>

                {weapon && weaponStats && (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm px-2 py-1.5">
                    <img
                      src={weapon.iconUrl}
                      alt={weapon.name}
                      className="h-9 w-9 object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-white/90 text-[10px] font-semibold leading-tight truncate max-w-[120px]">
                        {weapon.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-3 w-3 object-contain" />}
                          <span className="text-white/75 text-[9px]">{weaponStats.scaledAtk}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {weaponMainIcon && <img src={weaponMainIcon} alt={weapon.main_stat} className="h-3 w-3 object-contain" />}
                          <span className="text-white/75 text-[9px]">{weaponStats.scaledMainStat}%</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <span className="px-1 py-px rounded text-[8px] bg-black/40 border border-white/15 text-white/55 leading-none">
                          Lv.{state.weaponLevel}
                        </span>
                        <span className="px-1 py-px rounded text-[8px] bg-black/40 border border-white/20 text-white/70 font-medium leading-none">
                          R{state.weaponRank}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Body: FORTE LEFT | divider | STATS RIGHT */}
              <div className="flex flex-1 gap-3 min-h-0 overflow-hidden">
                {/* Forte — left side */}
                <div className="flex-2 flex flex-col min-w-0">
                  <div className="text-[8px] text-white/35 uppercase tracking-widest mb-1.5 text-center">Forte</div>
                  <ForteCardSection
                    character={selected.character}
                    forte={state.forte}
                    element={selected.element}
                    className="flex-1"
                  />
                </div>

                {/* Vertical divider */}
                <div className="w-px bg-white/10 shrink-0 self-stretch" />

                {/* Stats — right side */}
                <div className="flex-3 flex flex-col justify-center min-w-0">
                  <StatsTableSection />
                </div>
              </div>
            </div>
          </div>

          {/* ── BOTTOM: Echo section absolutely overlapping card bottom ── */}
          <div className="relative z-20 px-6" style={{ marginTop: '-72px' }}>
            <EchoesRowSection echoPanels={state.echoPanels} />
          </div>
        </>
      )}
    </div>
  );
});

BuildCard.displayName = 'BuildCard';
