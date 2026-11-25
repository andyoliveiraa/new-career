import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_LANGUAGE,
  getLanguageMeta,
  isSupportedLanguage,
  translate,
  type LanguageCode,
  type TranslationKey,
} from '../i18n';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  locale: string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Unauthenticated screens (Login / Register) always start in English by default
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE);
  }, []);

  const meta = getLanguageMeta(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
    document.title = translate(language, 'app.pageTitle');
  }, [language, meta.dir]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir: meta.dir,
        locale: meta.locale,
        isRtl: meta.dir === 'rtl',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
};
