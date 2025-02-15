'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ToastContainer } from 'react-toastify';
import type { OCRResponse, OCRContextType } from '@/types/ocr';
import { isCharacterAnalysis, isWeaponAnalysis, isEchoAnalysis, validateCharacterLevel, validateWeaponLevel, validateRank, validateEchoLevel, validateEchoElement } from '@/types/ocr';
import { useCharacters } from '@/hooks/useCharacters';
import { useWeapons } from '@/hooks/useWeapons';
import { useEchoes } from '@/hooks/useEchoes';
import { useMain } from '@/hooks/useMain';
import { useSubstats } from '@/hooks/useSub';
import { useMigrate } from '@/hooks/useMigrate';
import { WeaponType } from '@/types/weapon';
import { wakeupServer } from '@/components/Edit/Scan';

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

const OCRContext = createContext<OCRContextType | null>(null);

export const useOCRContext = () => {
    const context = useContext(OCRContext);
    if (!context) throw new Error('useOCRContext must be used within Providers');
    return context;
};

function OCRProvider({ children }: { children: ReactNode }) {
    const [ocrResult, setOCRResult] = useState<OCRResponse | null>(null);
    const [isLocked, setIsLocked] = useState(true);
    
    const setValidatedOCRResult = (result: OCRResponse) => {
        if (!result.success || !result.analysis) {
            setOCRResult(result);
            return;
        }

        if (isCharacterAnalysis(result.analysis)) {
            const validatedLevel = validateCharacterLevel(result.analysis.characterLevel);
            setOCRResult({
                ...result,
                analysis: {
                    ...result.analysis,
                    characterLevel: validatedLevel
                }
            });
        } 
        else if (isWeaponAnalysis(result.analysis)) {
            const validatedLevel = validateWeaponLevel(result.analysis.weaponLevel);
            const validatedRank = validateRank(result.analysis.rank);
            setOCRResult({
                ...result,
                analysis: {
                    ...result.analysis,
                    weaponLevel: validatedLevel,
                    rank: validatedRank
                }
            });
        }
        else if (isEchoAnalysis(result.analysis)) {
            const validatedLevel = validateEchoLevel(result.analysis.echoLevel);
            const validatedElement = validateEchoElement(result.analysis.element);
            setOCRResult({
                ...result,
                analysis: {
                    ...result.analysis,
                    echoLevel: validatedLevel,
                    element: validatedElement
                }
            });
        }
        else {
            setOCRResult(result);
        }
    };

    return (
        <OCRContext.Provider value={{ 
            ocrResult, 
            setOCRResult: setValidatedOCRResult, 
            clearOCRResult: () => setOCRResult(null),
            isLocked,
            unlock: () => setIsLocked(false)
        }}>
            {children}
        </OCRContext.Provider>
    );
}

function DataProvider({ children }: { children: ReactNode }) {
    useMigrate();
    wakeupServer();
    
    const { loading: charLoading } = useCharacters();
    const { loading: echoLoading } = useEchoes();
    const { loading: weaponLoading } = useWeapons({ weaponType: WeaponType.Sword });
    const { loading: mainStatLoading } = useMain();
    const { loading: subStatLoading } = useSubstats();
    
    const isLoading = charLoading || echoLoading || weaponLoading || mainStatLoading || subStatLoading;

    if (isLoading) {
        return <div className="loading">Loading game data...</div>;
    }
    
    return <>{children}</>;
}

function AnalyticsProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        if (GA_TRACKING_ID) {
            ReactGA.initialize(GA_TRACKING_ID);
        } else {
            console.warn('Google Analytics Tracking ID not found');
        }
    }, []);

    return (
        <>
            {children}
            <Analytics />
            <SpeedInsights />
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover draggable theme="dark" toastStyle={{ fontFamily: 'Gowun' }} />
        </>
    );
}

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AnalyticsProvider>
            <DataProvider>
                <OCRProvider>
                    {children}
                </OCRProvider>
            </DataProvider>
        </AnalyticsProvider>
    );
}