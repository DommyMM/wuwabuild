'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const currentLang = SUPPORTED_LANGUAGES[language];
  const languageEntries = Object.entries(SUPPORTED_LANGUAGES) as [LanguageCode, typeof currentLang][];

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-tertiary hover:bg-accent/20 border border-border hover:border-accent/50 transition-all duration-200 cursor-pointer"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <span className={`fi fi-${currentLang.countryCode} rounded-sm`} />
        <span className="text-sm font-medium text-text-primary hidden sm:inline">
          {language.toUpperCase()}
        </span>
        <svg
          className={`w-3 h-3 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 py-2 bg-background-secondary border border-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {languageEntries.map(([code, lang]) => (
            <button
              key={code}
              onClick={() => {
                setLanguage(code);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150
                ${language === code
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-primary hover:bg-accent/10 hover:text-accent'
                }
              `}
            >
              <span className={`fi fi-${lang.countryCode} text-lg rounded-sm`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{lang.nativeName}</span>
                <span className="text-xs text-text-secondary">{lang.name}</span>
              </div>
              {language === code && (
                <svg
                  className="w-4 h-4 ml-auto text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
