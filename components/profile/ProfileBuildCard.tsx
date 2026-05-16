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
import { ELEMENT_BLOOM, ELEMENT_TINT } from '@/lib/elementVisuals';
import { getBuildStandings, LBBuildRowEntry, LBStandingEntry, LBTeamMemberConfig } from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';

import { CharacterPanel } from '@/components/card/CharacterPanel';
import { SequenceStrip } from '@/components/card/SequenceStrip';
import { NameGroup } from '@/components/card/NameGroup';
import { WeaponGroup } from '@/components/card/WeaponGroup';
import { StatsTableSection } from '@/components/card/StatsTableSection';
import { TalentPills } from '@/components/card/TalentPills';
import { ActiveSetsSection } from '@/components/card/ActiveSetsSection';
import { EchoSection } from '@/components/card/EchoSection';
import { RankBoard, RankLoadoutIcon, RankModule, RankTeamMember } from '@/components/card/RankModule';

interface ProfileBuildCardProps {
  entry: LBBuildRowEntry;
}

export const ProfileBuildCard: React.FC<ProfileBuildCardProps> = ({ entry }) => {
  const selected = useSelectedCharacter();
  const { state } = useBuild();
  const { getWeapon, getCharacter, getEcho, fetters, levelCurves, statIcons } = useGameData();
  const { t } = useLanguage();
  const [activeHoverStat, setActiveHoverStat] = useState<StatHoverKey | null>(null);

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

  const weapon = getWeapon(state.weaponId);
  const weaponStats = useMemo(
    () => weapon ? calculateWeaponStats(weapon, state.weaponLevel, levelCurves) : null,
    [weapon, state.weaponLevel, levelCurves]
  );

  // Canonical board = the one matching the equipped weapon. Standings returns
  // every weapon variant the build's damage_map covers (one per LB track), so
  // without anchoring on state.weaponId we'd show a phantom rank for a weapon
  // the player never equipped.
  const canonicalStanding = useMemo<LBStandingEntry | null>(() => {
    if (standings.length === 0) return null;
    const ranked = standings.filter((s) => s.rank > 0 && s.total > 0);
    if (ranked.length === 0) return null;
    return ranked.find((s) => s.weaponId === state.weaponId) ?? ranked[0];
  }, [standings, state.weaponId]);

  const activeBoard = useMemo<RankBoard | null>(() => {
    if (!canonicalStanding) return null;
    const boardWeapon = getWeapon(canonicalStanding.weaponId);
    const weaponName = boardWeapon
      ? t(boardWeapon.nameI18n ?? { en: boardWeapon.name })
      : canonicalStanding.weaponId;
    const topPercent = computeTopPercent(canonicalStanding.rank, canonicalStanding.total);
    return {
      rank: canonicalStanding.rank,
      total: canonicalStanding.total,
      topPercent,
      tier: getRankTier(topPercent).letter,
      weaponId: canonicalStanding.weaponId,
      weaponName,
      weaponIcon: boardWeapon ? getWeaponPaths(boardWeapon) : undefined,
      weaponElement: selected?.element,
      sequence: entry.sequence,
      trackKey: canonicalStanding.trackKey,
      trackLabel: canonicalStanding.trackLabel || canonicalStanding.trackKey,
      damage: canonicalStanding.damage,
    };
  }, [canonicalStanding, getWeapon, t, selected?.element, entry.sequence]);

  // Lead = build's own character. Supports come from the active standing.
  const activeTeam = useMemo<RankTeamMember[]>(() => {
    if (!selected || !canonicalStanding) return [];

    const leadWeapon = getWeapon(state.weaponId);
    const leadIcons: RankLoadoutIcon[] = leadWeapon
      ? [{
        key: 'weapon',
        src: getWeaponPaths(leadWeapon),
        label: t(leadWeapon.nameI18n ?? { en: leadWeapon.name }),
      }]
      : [];

    const lead: RankTeamMember = {
      id: `lead-${selected.character.id}`,
      name: selected.displayName,
      head: selected.character.head ?? selected.character.iconRound,
      sequence: state.sequence,
      isLead: true,
      loadoutIcons: leadIcons,
    };

    const supports: RankTeamMember[] = canonicalStanding.teamMembers.map((member: LBTeamMemberConfig) => {
      const supportChar = getCharacter(member.charId);
      const supportWeapon = getWeapon(member.weaponId ?? null);
      const supportEcho = getEcho(member.echoId ?? null);
      const supportSet = fetters.find((f) => String(f.id) === member.setId);

      const icons: RankLoadoutIcon[] = [
        supportWeapon ? {
          key: 'weapon',
          src: getWeaponPaths(supportWeapon),
          label: t(supportWeapon.nameI18n ?? { en: supportWeapon.name }),
        } : null,
        supportEcho ? {
          key: 'echo',
          src: getEchoPaths(supportEcho),
          label: t(supportEcho.nameI18n ?? { en: supportEcho.name }),
        } : null,
        supportSet?.icon ? {
          key: 'set',
          src: supportSet.icon,
          label: t(supportSet.name),
        } : null,
      ].filter((icon): icon is RankLoadoutIcon => icon !== null);

      return {
        id: `support-${member.charId}`,
        name: supportChar ? t(supportChar.nameI18n ?? { en: supportChar.name }) : member.charId,
        head: supportChar?.head ?? supportChar?.iconRound,
        sequence: member.sequence ?? 0,
        loadoutIcons: icons,
      };
    });

    return [lead, ...supports];
  }, [selected, canonicalStanding, getWeapon, getCharacter, getEcho, fetters, state.weaponId, state.sequence, t]);

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

  const backgroundOverlays = (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-black/10" />
      <div className={`absolute inset-0 bg-linear-to-b ${tintClass}`} />
      <div className={`absolute inset-0 mix-blend-screen ${bloomClass}`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_35%,rgba(0,0,0,0.22)_100%)]" />
    </div>
  );

  return (
    <div className="build-card-frame relative w-full select-none overflow-visible">
      <div className="font-plus-jakarta tracking-wide leading-none text-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
        {/* Upper card — aspect-locked, splash + mid + stats only */}
        <div className="relative overflow-hidden rounded-t-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')] aspect-[2.4/1]">
          <div className="pointer-events-none absolute right-3/8 top-8/25 z-10 text-right text-xs font-semibold tracking-[0.18em] text-white/18 lowercase [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
            wuwa.build
          </div>
          {backgroundOverlays}

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

            <div className="flex h-full w-full">
              <div className="flex min-w-120 shrink-0 flex-col gap-3 pt-4">
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
                    ) : null}

                    <TalentPills character={selected.character} forte={state.forte} />

                    <RankModule
                      board={activeBoard}
                      team={activeTeam}
                      loading={standingsLoading}
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
          </div>
        </div>

        {/* Echoes — sibling below the aspect-locked card so they hang off cleanly. */}
        <div className="relative overflow-hidden rounded-b-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')]">
          {backgroundOverlays}
          <div className="relative z-10">
            <EchoSection
              echoPanels={state.echoPanels}
              showCV
              showRollQuality
              activeHoverStat={activeHoverStat}
              onHoverStatChange={setActiveHoverStat}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
