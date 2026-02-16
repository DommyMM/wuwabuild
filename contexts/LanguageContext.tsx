'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { I18nString } from '@/types/character';

// Supported languages matching I18nString from character.ts
// countryCode is used with flag-icons library (lowercase ISO 3166-1 alpha-2)
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', countryCode: 'us' },
  ja: { name: 'Japanese', nativeName: '日本語', countryCode: 'jp' },
  ko: { name: 'Korean', nativeName: '한국어', countryCode: 'kr' },
  'zh-Hans': { name: 'Chinese (Simplified)', nativeName: '简体中文', countryCode: 'cn' },
  'zh-Hant': { name: 'Chinese (Traditional)', nativeName: '繁體中文', countryCode: 'tw' },
  de: { name: 'German', nativeName: 'Deutsch', countryCode: 'de' },
  es: { name: 'Spanish', nativeName: 'Español', countryCode: 'es' },
  fr: { name: 'French', nativeName: 'Français', countryCode: 'fr' },
  th: { name: 'Thai', nativeName: 'ไทย', countryCode: 'th' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', countryCode: 'ua' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (text: I18nString | Record<string, string | undefined>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('wuwabuilds-language', lang);
    }
  }, []);

  // Load saved language on mount (after hydration to avoid mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('wuwabuilds-language') as LanguageCode | null;
    if (saved && saved in SUPPORTED_LANGUAGES) {
      setLanguageState(saved);
    }
  }, []);

  // Translation helper - returns text in current language, falls back to English
  const t = useCallback((text: I18nString | Record<string, string | undefined>): string => {
    return (text as Record<string, string | undefined>)[language] || text.en || '';
  }, [language]);

  const value = useMemo<LanguageContextType>(() => ({
    language,
    setLanguage,
    t,
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
