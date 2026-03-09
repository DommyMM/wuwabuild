'use client';

import { ReactNode } from 'react';
import { GameDataProvider, RawGameData } from './GameDataContext';
import { BuildProvider } from './BuildContext';
import { StatsProvider } from './StatsContext';
import { LanguageProvider } from './LanguageContext';
import { SavedState } from '@/lib/build';
import { ToastProvider } from './ToastContext';

export type { RawGameData };

interface AppProvidersProps {
  children: ReactNode;
  initialBuildState?: SavedState;
  initialGameData?: RawGameData | null;
}

export function AppProviders({ children, initialBuildState, initialGameData }: AppProvidersProps) {
  return (
    <LanguageProvider>
      <GameDataProvider initialData={initialGameData}>
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
