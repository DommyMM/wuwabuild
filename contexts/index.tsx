'use client';

import { ReactNode } from 'react';
import { GameDataProvider, useGameData } from './GameDataContext';
import { BuildProvider } from './BuildContext';
import { StatsProvider } from './StatsContext';
import { LanguageProvider } from './LanguageContext';
import { SavedState } from '@/lib/build';
import { ToastProvider } from './ToastContext';

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
 * 5. ToastProvider - Global transient feedback (success/error/warning/info)
 */
export function AppProviders({ children, initialBuildState }: AppProvidersProps) {
  return (
    <LanguageProvider>
      <GameDataProvider>
        <BuildProvider initialState={initialBuildState}>
          <StatsProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </StatsProvider>
        </BuildProvider>
      </GameDataProvider>
    </LanguageProvider>
  );
}

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
