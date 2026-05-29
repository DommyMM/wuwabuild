'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { GameDataLoadingGate, GameDataProvider } from './GameDataContext';
import { BuildProvider } from './BuildContext';
import { StatsProvider } from './StatsContext';
import { LanguageProvider } from './LanguageContext';
import { SavedState } from '@/lib/build';
import { ToastProvider } from './ToastContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function RootProviders({ children }: AppProvidersProps) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}

function isServerRenderedDossierPath(pathname: string | null): boolean {
  return pathname?.startsWith('/characters/') === true || pathname?.startsWith('/weapons/') === true;
}

export function ToolProviders({ children }: AppProvidersProps) {
  const pathname = usePathname();

  if (isServerRenderedDossierPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <GameDataProvider>
      <ToastProvider>
        <GameDataLoadingGate>{children}</GameDataLoadingGate>
      </ToastProvider>
    </GameDataProvider>
  );
}

interface EditorProvidersProps {
  children: ReactNode;
  initialBuildState?: SavedState;
}

export function EditorProviders({ children, initialBuildState }: EditorProvidersProps) {
  return (
    <BuildProvider initialState={initialBuildState}>
      <StatsProvider>
        {children}
      </StatsProvider>
    </BuildProvider>
  );
}
