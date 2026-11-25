export type LanguageCode = 'en' | 'pt' | 'de' | 'es' | 'zh' | 'ar' | 'ko';

export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
  locale: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', locale: 'en-US' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr', locale: 'pt-PT' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr', locale: 'de-DE' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', locale: 'es-ES' },
  { code: 'zh', nativeName: '中文 (简体)', englishName: 'Mandarin Chinese', dir: 'ltr', locale: 'zh-CN' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', locale: 'ar-SA' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', dir: 'ltr', locale: 'ko-KR' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isSupportedLanguage(code: unknown): code is LanguageCode {
  return typeof code === 'string' && LANGUAGES.some((l) => l.code === code);
}

export function getLanguageMeta(code: LanguageCode): LanguageOption {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
