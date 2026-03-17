'use client';

import { forwardRef, useMemo, useState } from 'react';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateWeaponStats } from '@/lib/calculations/stats';
import { getUnconditionalWeaponPassiveBonuses } from '@/lib/calculations/weaponPassives';
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
  const weaponMainIcon = weapon?.main_stat ? statIcons?.[weapon.main_stat] ?? null : null;
  const weaponAtkHoverKey = normalizeStatHoverKey('ATK');
  const weaponMainHoverKey = weapon
    ? (normalizeStatHoverKey(weapon.main_stat) ?? normalizeStatHoverKey(weapon.mainStatI18n?.en))
    : null;
  const weaponPassiveHoverKeys = useMemo(() => {
    if (!weapon) return new Set<StatHoverKey>();

    const passiveBonuses = getUnconditionalWeaponPassiveBonuses(weapon, state.weaponRank);
    const hoverKeys = Object.keys(passiveBonuses)
      .map((statName) => normalizeStatHoverKey(statName))
      .filter((hoverKey): hoverKey is StatHoverKey => hoverKey !== null);

    return new Set<StatHoverKey>(hoverKeys);
  }, [weapon, state.weaponRank]);
  const weaponPassiveHoverMatch = Boolean(
    activeHoverStat && weaponPassiveHoverKeys.has(activeHoverStat)
  );

  return (
    <div ref={ref} className="relative select-none overflow-visible">
      {selected && (
        <div className="font-plus-jakarta tracking-wide leading-none text-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
          <div className="relative overflow-hidden rounded-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')] aspect-[2.4/1]">
            <div className="pointer-events-none absolute right-3/8 top-8/25 z-10 text-right text-xs font-semibold tracking-[0.18em] text-white/18 lowercase [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
              wuwa.build
            </div>
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
                  <div className="flex min-w-120 shrink-0 flex-col pt-4 gap-1">
                    <div className="flex gap-4">
                      <SequenceStrip
                        chains={selected.character.chains ?? []}
                        sequence={state.sequence}
                        element={selected.element}
                        characterName={selected.nameI18n}
                      />
                      <div className="flex flex-1 flex-col space-y-2">
                        <NameGroup selected={selected} characterLevel={state.characterLevel} />

                        {weapon && weaponStats ? (
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
                            weaponPassiveHoverMatch={weaponPassiveHoverMatch}
                          />
                        ) : (
                          <div className="flex items-center gap-2 opacity-85">
                            <div className="relative flex h-30 w-30 items-center justify-center overflow-hidden rounded-xl border border-white/24 bg-black/22 shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
                              <span className="text-4xl font-semibold leading-none text-white/32">?</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-2xl font-semibold leading-tight text-white/55">
                                No Weapon Selected
                              </span>
                              <div className="flex items-center gap-2.5 text-sm font-medium leading-none text-white/55">
                                <span className="rounded-md border border-white/16 bg-black/35 px-3 py-1.5">
                                  Lv.1
                                </span>
                                <span className="rounded-md border border-white/20 bg-black/35 px-3 py-1.5">
                                  R1
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <ForteCardSection
                          character={selected.character}
                          forte={state.forte}
                          activeHoverStat={activeHoverStat}
                          onHoverStatChange={setActiveHoverStat}
                        />
                      </div>
                    </div>
                    <ActiveSetsSection
                      showCV={showCV}
                      activeHoverStat={activeHoverStat}
                      onHoverStatChange={setActiveHoverStat}
                    />
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
