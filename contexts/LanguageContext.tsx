'use client';

import { createContext, useContext, useCallback, useEffect, useMemo, useSyncExternalStore, ReactNode } from 'react';
import type { I18nString } from '@/lib/character';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/clientStorage';
import { setSharedProperties } from '@/lib/analytics';

/**
 * Supported languages, matching I18nString in character.ts
 *
 * countryCode names the flag file in public/flags, lowercase ISO 3166-1 alpha-2
 */
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

const LANGUAGE_STORAGE_KEY = 'wuwabuilds-language';

// External store over localStorage, so hydration renders the server's English and the saved language applies right after
// A useState initializer reading storage would make the first client render differ from the HTML for every non-English reader
const listeners = new Set<() => void>();
const subscribeLanguage = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
// Set by the switcher, so a pick still applies when storage refuses the write
let chosenLanguage: LanguageCode | null = null;
const getLanguageSnapshot = (): LanguageCode => {
  if (chosenLanguage) return chosenLanguage;
  const saved = getLocalStorageItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
  return saved && saved in SUPPORTED_LANGUAGES ? saved : 'en';
};
const getLanguageServerSnapshot = (): LanguageCode => 'en';

export function LanguageProvider({ children }: LanguageProviderProps) {
  const language = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getLanguageServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = language;
    setSharedProperties({ ui_language: language });
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    chosenLanguage = lang;
    void setLocalStorageItem(LANGUAGE_STORAGE_KEY, lang);
    listeners.forEach((listener) => listener());
  }, []);

  // Falls back to English when the current language has no entry
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
