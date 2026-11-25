import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';

const dmSans = loadDMSans('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

const spaceGrotesk = loadSpaceGrotesk('normal', {
  weights: ['500', '600', '700'],
  subsets: ['latin'],
});

export const FONTS = {
  sans: dmSans.fontFamily,
  display: spaceGrotesk.fontFamily,
};

export const THEME = {
  bg: '#090d16',
  surface100: '#111827',
  surface200: '#161f30',
  surface300: '#1f293d',
  border: '#24324a',
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentLight: '#3b82f6',
  accentMuted: 'rgba(37, 99, 235, 0.14)',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  emerald: '#10b981',
  emeraldLight: '#34d399',
  amber: '#f59e0b',
  indigo: '#6366f1',
  discord: '#5865F2',
};
