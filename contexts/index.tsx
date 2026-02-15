'use client';

import React, { ReactNode } from 'react';
import { GameDataProvider, useGameData } from './GameDataContext';
import { BuildProvider, useBuild } from './BuildContext';
import { StatsProvider, useStats } from './StatsContext';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { SavedState } from '@/types/build';

// Re-export hooks
export { useGameData } from './GameDataContext';
export { useBuild } from './BuildContext';
export { useStats } from './StatsContext';
export { useLanguage } from './LanguageContext';

// Re-export providers for individual use
export { GameDataProvider } from './GameDataContext';
export { BuildProvider } from './BuildContext';
export { StatsProvider } from './StatsContext';
export { LanguageProvider } from './LanguageContext';

// ============================================================================
// Combined Provider
// ============================================================================

interface AppProvidersProps {
  children: ReactNode;
  initialBuildState?: SavedState;
}

/**
 * Combined app providers that set up the full context hierarchy.
 * Use this to wrap your app or pages that need access to game data, build state, and stats.
 *
 * Provider hierarchy:
 * 1. LanguageProvider - Manages i18n language selection
 * 2. GameDataProvider - Loads and caches all game data (characters, weapons, echoes, etc.)
 * 3. BuildProvider - Manages the current build state (character, weapon, echoes, etc.)
 * 4. StatsProvider - Calculates derived stats from game data + build state
 */
export function AppProviders({ children, initialBuildState }: AppProvidersProps) {
  return (
    <LanguageProvider>
      <GameDataProvider>
        <BuildProvider initialState={initialBuildState}>
          <StatsProvider>
            {children}
          </StatsProvider>
        </BuildProvider>
      </GameDataProvider>
    </LanguageProvider>
  );
}

// ============================================================================
// Loading Component
// ============================================================================

interface DataLoadingGateProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: (error: string) => ReactNode;
}

/**
 * Component that gates its children behind game data loading.
 * Shows loading state while data is being fetched.
 */
export function DataLoadingGate({
  children,
  loadingComponent = <DefaultLoadingComponent />,
  errorComponent = DefaultErrorComponent
}: DataLoadingGateProps) {
  const { loading, error } = useGameData();

  if (loading) {
    return <>{loadingComponent}</>;
  }

  if (error) {
    return <>{errorComponent(error)}</>;
  }

  return <>{children}</>;
}

function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading game data...</div>
    </div>
  );
}

function DefaultErrorComponent(error: string) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-red-500">Error: {error}</div>
    </div>
  );
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Combined hook that returns all context values at once.
 * Useful when you need access to multiple contexts.
 */
export function useAppContext() {
  const gameData = useGameData();
  const build = useBuild();
  const stats = useStats();

  return {
    gameData,
    build,
    stats
  };
}

/**
 * Hook to get the current character from game data based on build state.
 */
export function useCurrentCharacter() {
  const { getCharacter } = useGameData();
  const { state } = useBuild();

  return getCharacter(state.characterState.id);
}

/**
 * Hook to get the current weapon from game data based on build state.
 */
export function useCurrentWeapon() {
  const { getWeapon } = useGameData();
  const { state } = useBuild();

  return getWeapon(state.weaponState.id);
}

/**
 * Hook to get echoes for the current build's echo panels.
 */
export function useCurrentEchoes() {
  const { getEcho } = useGameData();
  const { state } = useBuild();

  return state.echoPanels.map(panel => ({
    panel,
    echo: panel.id ? getEcho(panel.id) : null
  }));
}
