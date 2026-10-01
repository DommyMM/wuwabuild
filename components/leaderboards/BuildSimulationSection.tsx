'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Character } from '@/lib/character';
import { getBoardDistribution, getBoardOptimality, getBuildMoves, getBuildRerolls, getBuildStandings, isHealTrackKey, LBBoardDistribution, LBBoardOptimality, LBBuildDetailEntry, LBMoveEntry, LBRerolls, LBStandingEntry } from '@/lib/lb';
import { BuildMoveBreakdown } from './BuildMoveBreakdown';
import { BuildStatDistribution } from './BuildStatDistribution';
import { BuildRerolls } from './BuildRerolls';
import { BuildStandingsTable } from './BuildStandingsTable';
import { ScoringMode } from './constants';
import { RegionBadge } from '@/lib/regionBadge';
import { transportError, useKeyedResource } from './useKeyedResource';
import { capture } from '@/lib/analytics';

const BuildOptimalityPanel = dynamic(() => import('./BuildOptimalityPanel').then((module) => module.BuildOptimalityPanel), {
  ssr: false,
  loading: () => (
    <div className="rounded border border-border bg-background-secondary/70 p-3 text-center text-xs text-text-primary/55">
      Loading benchmark...
    </div>
  ),
});

function formatTrackLabel(trackKey: string): string {
  return trackKey
    .split('_')
    .filter(Boolean)
    .map((part) => {
      if (/^s\d+$/i.test(part)) return part.toUpperCase();
      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(' ');
}

/** One equal-width control in the row under the card, the surface's action first and the bench sections after */
const CONTROL_CLASS = 'flex w-43 cursor-pointer items-center justify-center gap-2 rounded border bg-background-secondary px-4 py-2 text-xs font-semibold transition-[color,border-color,transform] duration-150 hover:border-accent/60 hover:text-text-primary active:scale-[0.98] motion-reduce:transition-none';
const CONTROL_REST_CLASS = 'border-border text-text-primary/75';
// Open button holds the accent border, so the row itself says what is open
const CONTROL_OPEN_CLASS = 'border-accent/60 text-text-primary';
const ACTION_BUTTON_CLASS = `${CONTROL_CLASS} ${CONTROL_REST_CLASS}`;
/**
 * Caps the control row to the scroller's visible width, published as `--scrollport` by useScrollportVar
 *
 * - The expanded row can be wider than the viewport, so a row centred in it would rest half a screen off
 * - Inert when the table fits, because the cap is then wider than the row
 */
const CONTROL_ROW_CLASS = 'w-full max-w-(--scrollport,none)';

const SectionToggle: React.FC<{
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  title?: string;
}> = ({ label, isOpen, onToggle, title }) => (
  <button
    type="button"
    aria-expanded={isOpen}
    onClick={onToggle}
    className={`${CONTROL_CLASS} ${isOpen ? CONTROL_OPEN_CLASS : CONTROL_REST_CLASS}`}
    title={title}
  >
    <span>{label}</span>
    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${isOpen ? 'rotate-180 text-accent' : ''}`} />
  </button>
);

interface BuildSimulationSectionProps {
  buildId: string;
  buildDetail: LBBuildDetailEntry;
  character: Character | null;
  characterId: string;
  characterName: string;
  regionBadge: RegionBadge | null;
  activeWeaponId: string;
  activeTrackKey: string;
  isExpanded: boolean;
  baseDamage?: number;
  currentScoring?: ScoringMode;
  /** Leaderboard surfaces hand the reader to the owner's profile, where the full card lives */
  viewProfileHref?: string;
  /** Analytics hook only, since the Link owns the navigation */
  onViewProfile?: () => void;
  /** Loads the build into the editor, for the profile surface and for a build with no profile to go to */
  onOpenInEditor?: () => void;
  /** Page hosting the row, recorded as `surface` on `build_panel_open` */
  surface: 'builds' | 'leaderboard_character' | 'profile';
}

/** Disclosure under a build, sent as `build_panel_open.panel` */
type BenchPanel = 'moves' | 'upgrades' | 'rank' | 'stat_comparison' | 'bench';

export const BuildSimulationSection: React.FC<BuildSimulationSectionProps> = ({
  buildId,
  buildDetail,
  character,
  characterId,
  characterName,
  regionBadge,
  activeWeaponId,
  activeTrackKey,
  isExpanded,
  baseDamage,
  currentScoring = 'adjusted',
  viewProfileHref,
  onViewProfile,
  onOpenInEditor,
  surface,
}) => {
  const { getWeapon, statIcons } = useGameData();
  const { t } = useLanguage();

  const [isMovesOpen, setIsMovesOpen] = useState(false);
  const [isUpgradesOpen, setIsUpgradesOpen] = useState(false);
  const [isOptimalityOpen, setIsOptimalityOpen] = useState(false);
  const [isStandingsOpen, setIsStandingsOpen] = useState(false);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);

  const hasBoardContext = buildId.length > 0 && activeWeaponId.length > 0 && activeTrackKey.length > 0;
  // Moves, upgrades and the benchmark are all scoped to one build on one board
  const boardKey = `${buildId}:${activeWeaponId}:${activeTrackKey}`;
  const weapon = getWeapon(activeWeaponId);
  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : activeWeaponId;
  const trackLabel = formatTrackLabel(activeTrackKey);
  const isHealing = isHealTrackKey(activeTrackKey);

  const movesResource = useKeyedResource<LBMoveEntry[]>({
    key: boardKey,
    enabled: isExpanded && isMovesOpen && hasBoardContext,
    fetch: (signal) => getBuildMoves(buildId, activeWeaponId, activeTrackKey, signal),
    errorMessage: transportError('Failed to load move breakdown.'),
  });
  const rerollsResource = useKeyedResource<LBRerolls | null>({
    key: boardKey,
    enabled: isExpanded && isUpgradesOpen && hasBoardContext,
    fetch: (signal) => getBuildRerolls(buildId, activeWeaponId, activeTrackKey, signal),
    errorMessage: transportError('Failed to load substat upgrades.'),
  });
  const optimalityResource = useKeyedResource<LBBoardOptimality | null>({
    key: boardKey,
    enabled: isExpanded && isOptimalityOpen && hasBoardContext,
    fetch: (signal) => getBoardOptimality(characterId, activeWeaponId, activeTrackKey, buildId, signal),
    errorMessage: transportError('Failed to load reference benchmark.'),
  });
  // Keyed on the board alone because the distribution describes the board, so every row shares one cache entry
  const distributionResource = useKeyedResource<LBBoardDistribution | null>({
    key: hasBoardContext ? `${characterId}:${activeWeaponId}:${activeTrackKey}` : '',
    enabled: isExpanded && isDistributionOpen && hasBoardContext,
    fetch: (signal) => getBoardDistribution(characterId, activeWeaponId, activeTrackKey, signal),
    errorMessage: transportError('Failed to load board distribution.'),
  });
  // Keyed on the build alone because standings span every board it appears on
  // The transport error is swallowed for a reader-facing message
  const standingsResource = useKeyedResource<LBStandingEntry[]>({
    key: characterId && buildId ? `${characterId}:${buildId}` : '',
    enabled: isExpanded && isStandingsOpen,
    fetch: (signal) => getBuildStandings(characterId, buildId, signal),
    errorMessage: () => 'Could not load leaderboard rankings.',
  });

  const moves = movesResource.data ?? [];
  const rerolls = rerollsResource.data ?? null;
  const optimality = optimalityResource.data ?? null;
  // The rerolls payload recomputes the board Score, so once loaded it is the figure every panel prints
  const scoreBaseDamage = rerolls && rerolls.score > 0
    ? rerolls.score
    : currentScoring === 'raw'
      ? undefined
      : baseDamage;

  const boardTitle = `${weaponName} \u2022 ${trackLabel}`;

  /** Flips one bench panel, recording the open and not the close */
  const togglePanel = (panel: BenchPanel, isOpen: boolean, setOpen: (open: boolean) => void) => {
    if (!isOpen) {
      capture('build_panel_open', { panel, surface, character_id: characterId || null, track_key: activeTrackKey || null });
    }
    // Disclosures rather than tabs, so any number can be open and their panels stack below in button order
    setOpen(!isOpen);
  };

  return (
    // Width comes from the host shell so every section of the expanded row shares one measure
    <div className="relative w-full space-y-3 font-plus-jakarta">
      <div className={CONTROL_ROW_CLASS}>
        <div className="flex flex-wrap justify-center gap-2">
          {viewProfileHref ? (
            <Link href={viewProfileHref} onClick={onViewProfile} className={ACTION_BUTTON_CLASS}>
              View in Profile
            </Link>
          ) : onOpenInEditor ? (
            <button type="button" onClick={onOpenInEditor} className={ACTION_BUTTON_CLASS}>
              Open in Editor
            </button>
          ) : null}

          {hasBoardContext && (
            <>
              <SectionToggle
                label={`${isHealing ? 'Heal' : 'Move'} breakdown`}
                isOpen={isMovesOpen}
                onToggle={() => togglePanel('moves', isMovesOpen, setIsMovesOpen)}
                title={boardTitle}
              />
              <SectionToggle
                label="Substat upgrades"
                isOpen={isUpgradesOpen}
                onToggle={() => togglePanel('upgrades', isUpgradesOpen, setIsUpgradesOpen)}
                title={boardTitle}
              />
            </>
          )}

          <SectionToggle
            label="Leaderboard rank"
            isOpen={isStandingsOpen}
            onToggle={() => togglePanel('rank', isStandingsOpen, setIsStandingsOpen)}
          />

          {hasBoardContext && (
            <>
              <SectionToggle
                label="Stat comparison"
                isOpen={isDistributionOpen}
                onToggle={() => togglePanel('stat_comparison', isDistributionOpen, setIsDistributionOpen)}
                title={boardTitle}
              />
              <SectionToggle
                label="Theoretical bench"
                isOpen={isOptimalityOpen}
                onToggle={() => togglePanel('bench', isOptimalityOpen, setIsOptimalityOpen)}
                title={boardTitle}
              />
            </>
          )}
        </div>
      </div>

      {hasBoardContext && isMovesOpen && (
        <BuildMoveBreakdown
          isLoading={movesResource.isLoading}
          error={movesResource.error}
          moves={moves}
          isHealing={isHealing}
          scoreOverride={scoreBaseDamage}
          skillIcons={character?.skillIcons}
          elementIcon={character?.elementIcon}
          statIcons={statIcons}
          onRetry={movesResource.retry}
        />
      )}

      {hasBoardContext && isUpgradesOpen && (
        <div className="space-y-2">
          {currentScoring === 'raw' && (
            <p className="text-center text-xs leading-snug text-text-primary/55">
              Substat upgrades use Score, matching official ranks
            </p>
          )}
          <BuildRerolls
            isLoading={rerollsResource.isLoading}
            error={rerollsResource.error}
            data={rerolls}
            buildDetail={buildDetail}
            onRetry={rerollsResource.retry}
          />
        </div>
      )}

      {isStandingsOpen && (
        <section className="space-y-2">
          <BuildStandingsTable
            standings={standingsResource.data ?? null}
            standingsLoading={standingsResource.isLoading}
            standingsError={standingsResource.error}
            characterId={characterId}
            characterName={characterName}
            buildId={buildId}
            hasBoardContext={hasBoardContext}
            activeWeaponId={activeWeaponId}
            activeTrackKey={activeTrackKey}
            currentScoring={currentScoring}
            onRetry={standingsResource.retry}
          />
        </section>
      )}

      {hasBoardContext && isDistributionOpen && (
        <BuildStatDistribution
          data={distributionResource.data ?? null}
          buildDetail={buildDetail}
          loading={distributionResource.isLoading}
          error={distributionResource.error}
          onRetry={distributionResource.retry}
        />
      )}

      {hasBoardContext && isOptimalityOpen && (
        <BuildOptimalityPanel
          data={optimality}
          loading={optimalityResource.isLoading}
          error={optimalityResource.error}
          baseDamage={scoreBaseDamage}
          buildDetail={buildDetail}
          character={character}
          characterName={characterName}
          regionBadge={regionBadge}
          onRetry={optimalityResource.retry}
        />
      )}
    </div>
  );
};
