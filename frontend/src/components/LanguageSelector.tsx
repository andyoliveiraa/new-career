import React from 'react';
import { Globe } from 'lucide-react';
import { LANGUAGES, type LanguageCode } from '../i18n';

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  ariaLabel?: string;
  compact?: boolean;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  ariaLabel = 'Language',
  compact = false,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        className={`bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer ${
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
        }`}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
};
