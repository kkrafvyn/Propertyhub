import type { Theme } from '../types';

export const THEME_STORAGE_KEY = 'theme';

export const themeOptions = [
  { value: 'system', label: 'System', description: 'Match your device appearance' },
  { value: 'light', label: 'Light', description: 'Bright surfaces with familiar system contrast' },
  { value: 'dark', label: 'Dark', description: 'Dark materials that stay easy on the eyes' },
  {
    value: 'high-contrast',
    label: 'High contrast',
    description: 'Stronger separation for accessibility-focused browsing',
  },
] as const;

export type ThemeOption = (typeof themeOptions)[number]['value'];
export type ThemeVariant = Exclude<Theme, 'system'>;

const themeClassNames = ['light', 'dark', 'high-contrast'] as const;
const legacyThemeClassNames = ['sunset', 'coastal', 'blue', 'green', 'purple', 'orange'] as const;

const legacyThemeMap: Record<string, Theme> = {
  blue: 'light',
  green: 'light',
  purple: 'light',
  orange: 'light',
  sunset: 'light',
  coastal: 'light',
};

export const normalizeTheme = (theme?: string | null): Theme => {
  if (!theme) return 'system';

  if (theme === 'light' || theme === 'dark' || theme === 'system' || theme === 'high-contrast') {
    return theme;
  }

  return legacyThemeMap[theme] || 'system';
};

export const resolveTheme = (theme: Theme): ThemeVariant => {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  return theme;
};

export const applyTheme = (
  theme: Theme,
  root: HTMLElement = document.documentElement
): ThemeVariant => {
  const resolvedTheme = resolveTheme(theme);
  root.classList.remove(...themeClassNames, ...legacyThemeClassNames);
  root.classList.add(resolvedTheme);
  return resolvedTheme;
};

export const getToastTheme = (theme: Theme): 'light' | 'dark' =>
  resolveTheme(theme) === 'light' ? 'light' : 'dark';
