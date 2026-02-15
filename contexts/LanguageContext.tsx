'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

// Supported languages matching I18nString from character.ts
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  'zh-Hans': { name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  'zh-Hant': { name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (text: Record<string, string | undefined>) => string;
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

  // Load saved language on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wuwabuilds-language') as LanguageCode | null;
      if (saved && saved in SUPPORTED_LANGUAGES) {
        setLanguageState(saved);
      }
    }
  });

  // Translation helper - returns text in current language, falls back to English
  const t = useCallback((text: Record<string, string | undefined>): string => {
    return text[language] || text.en || '';
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
