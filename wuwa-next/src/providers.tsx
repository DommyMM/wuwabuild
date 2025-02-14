'use client';

import { OCRProvider } from '@/contexts/OCRContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <OCRProvider>
        {children}
        </OCRProvider>
    );
}