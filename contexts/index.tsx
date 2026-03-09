'use client';

import { ReactNode } from 'react';
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

export function ToolProviders({ children }: AppProvidersProps) {
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
