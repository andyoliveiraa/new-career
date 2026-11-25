import { en, type TranslationDict } from './locales/en';
import { pt } from './locales/pt';
import { de } from './locales/de';
import { es } from './locales/es';
import { zh } from './locales/zh';
import { ar } from './locales/ar';
import { ko } from './locales/ko';
import { type LanguageCode } from './types';

export * from './types';

export const TRANSLATIONS: Record<LanguageCode, TranslationDict> = {
  en,
  pt,
  de,
  es,
  zh,
  ar,
  ko,
};

type NestedKeys<T> = {
  [K in keyof T & string]: T[K] extends Record<string, string>
    ? `${K}.${keyof T[K] & string}`
    : never;
}[keyof T & string];

export type TranslationKey = NestedKeys<TranslationDict>;

export function translate(
  lang: LanguageCode,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const [section, item] = key.split('.') as [keyof TranslationDict, string];
  const dict = TRANSLATIONS[lang] || en;
  const sectionObj = dict[section] as Record<string, string> | undefined;
  const fallbackSection = en[section] as Record<string, string> | undefined;
  let text = sectionObj?.[item] ?? fallbackSection?.[item] ?? key;

  if (vars) {
    for (const [varName, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${varName}\\}`, 'g'), String(value));
    }
  }
  return text;
}
