'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { calculateWeaponStats } from '@/lib/calculations/stats';
import { getUnconditionalWeaponPassiveBonuses } from '@/lib/calculations/weaponPassives';
import { computeTopPercent, getRankTier } from '@/lib/calculations/rankTier';
import { DEFAULT_CARD_ART_TRANSFORM } from '@/lib/cardArt';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';
import { DEFAULT_PREFERRED_STATS } from '@/lib/calculations/rollValues';
import { ELEMENT_BLOOM, ELEMENT_TINT } from '@/lib/elementVisuals';
import { getBuildStandings, LBBuildRowEntry, LBStandingEntry } from '@/lib/lb';

import { CharacterPanel } from '@/components/card/CharacterPanel';
import { SequenceStrip } from '@/components/card/SequenceStrip';
import { NameGroup } from '@/components/card/NameGroup';
import { WeaponGroup } from '@/components/card/WeaponGroup';
import { StatsTableSection } from '@/components/card/StatsTableSection';
import { TalentPills } from '@/components/card/TalentPills';
import { ActiveSetsSection } from '@/components/card/ActiveSetsSection';
import { EchoSection } from '@/components/card/EchoSection';
import { RankBoard, RankMode, RankModule } from '@/components/card/RankModule';
import { RVBar } from '@/components/card/RVBar';

const RANK_MODE_STORAGE_KEY = 'wuwabuilds:profile-card-rank-mode';

const readPersistedMode = (): RankMode => {
  if (typeof window === 'undefined') return 'damage';
  try {
    const raw = window.localStorage.getItem(RANK_MODE_STORAGE_KEY);
    return raw === 'rv' ? 'rv' : 'damage';
  } catch {
    return 'damage';
  }
};

interface ProfileBuildCardProps {
  entry: LBBuildRowEntry;
}

export const ProfileBuildCard: React.FC<ProfileBuildCardProps> = ({ entry }) => {
  const selected = useSelectedCharacter();
  const { state } = useBuild();
  const { getWeapon, levelCurves, statIcons } = useGameData();
  const { t } = useLanguage();
  const [activeHoverStat, setActiveHoverStat] = useState<StatHoverKey | null>(null);

  const [mode, setMode] = useState<RankMode>(() => readPersistedMode());
  const [activeBoardIdx, setActiveBoardIdx] = useState(0);
  const [standings, setStandings] = useState<LBStandingEntry[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const characterId = entry.character.id;
  const buildId = entry.id;

  useEffect(() => {
    if (!characterId || !buildId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setStandingsLoading(true);
      setStandings([]);
      setActiveBoardIdx(0);
    });

    getBuildStandings(characterId, buildId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setStandings(result);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStandings([]);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setStandingsLoading(false);
      });

    return () => controller.abort();
  }, [characterId, buildId]);

  const handleModeChange = (next: RankMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(RANK_MODE_STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
  };

  const weapon = getWeapon(state.weaponId);
  const weaponStats = useMemo(
    () => weapon ? calculateWeaponStats(weapon, state.weaponLevel, levelCurves) : null,
    [weapon, state.weaponLevel, levelCurves]
  );

  const preferredStats = selected?.character.preferredStats ?? DEFAULT_PREFERRED_STATS;

  const boards = useMemo<RankBoard[]>(() => {
    if (standings.length === 0) return [];
    const next = standings
      .filter((s) => s.rank > 0 && s.total > 0)
      .map<RankBoard>((s) => {
        const weapon = getWeapon(s.weaponId);
        const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : s.weaponId;
        const topPercent = computeTopPercent(s.rank, s.total);
        return {
          rank: s.rank,
          total: s.total,
          topPercent,
          tier: getRankTier(topPercent).letter,
          weaponId: s.weaponId,
          weaponName,
          weaponElement: selected?.element,
          sequence: entry.sequence,
          trackKey: s.trackKey,
          trackLabel: s.trackLabel || s.trackKey,
          damage: s.damage,
        };
      });
    next.sort((a, b) => a.rank - b.rank);
    return next;
  }, [standings, getWeapon, t, selected?.element, entry.sequence]);

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

  if (!selected) return null;

  return (
    <div className="build-card-frame relative w-full select-none overflow-visible">
      <div className="font-plus-jakarta tracking-wide leading-none text-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
        <div className="relative overflow-hidden rounded-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')] aspect-[2.22/1]">
          <div className="pointer-events-none absolute right-3/8 top-8/25 z-10 text-right text-xs font-semibold tracking-[0.18em] text-white/18 lowercase [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
            wuwa.build
          </div>
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/10" />
            <div className={`absolute inset-0 bg-linear-to-b ${tintClass}`} />
            <div className={`absolute inset-0 mix-blend-screen ${bloomClass}`} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_35%,rgba(0,0,0,0.22)_100%)]" />
          </div>

          <div className="relative z-10 flex h-full">
            <CharacterPanel
              selected={selected}
              tintClass={tintClass}
              username={state.watermark.username}
              uid={state.watermark.uid}
              artSource={state.watermark.artSource}
              onArtSourceChange={() => {}}
              artTransform={DEFAULT_CARD_ART_TRANSFORM}
              artSourceMode="default"
              customArtUrl={null}
              isArtEditMode={false}
              onCustomArtUpload={() => {}}
              onArtTransformChange={() => {}}
            />

            <div className="flex w-full flex-col">
              <div className="flex">
                <div className="flex min-w-120 shrink-0 flex-col gap-3 pt-4">
                  <div className="flex gap-4">
                    <SequenceStrip
                      chains={selected.character.chains ?? []}
                      sequence={state.sequence}
                      element={selected.element}
                      characterName={selected.nameI18n}
                    />
                    <div className="flex flex-1 flex-col gap-2">
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
                      ) : null}

                      <TalentPills forte={state.forte} />

                      <RankModule
                        mode={mode}
                        boards={boards}
                        activeIdx={activeBoardIdx}
                        loading={standingsLoading}
                        onModeChange={handleModeChange}
                        onBoardChange={setActiveBoardIdx}
                      />
                    </div>
                  </div>

                  <ActiveSetsSection
                    showCV
                    activeHoverStat={activeHoverStat}
                    onHoverStatChange={setActiveHoverStat}
                  />
                </div>

                <StatsTableSection
                  activeHoverStat={activeHoverStat}
                  onHoverStatChange={setActiveHoverStat}
                />
              </div>

              <EchoSection
                echoPanels={state.echoPanels}
                showCV
                showRollQuality
                activeHoverStat={activeHoverStat}
                onHoverStatChange={setActiveHoverStat}
              />

              <div className="px-4 pb-3">
                <RVBar echoPanels={state.echoPanels} preferredStats={preferredStats} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
