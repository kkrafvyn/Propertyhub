import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '../types';
import { applyTheme, normalizeTheme, THEME_STORAGE_KEY } from '../utils/theme';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      if (typeof window === 'undefined') return defaultTheme;
      return normalizeTheme(localStorage.getItem(storageKey));
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    try {
      applyTheme(theme, window.document.documentElement);
    } catch (error) {
      console.warn('Error applying theme:', error);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system', window.document.documentElement);

    handleChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        const normalizedTheme = normalizeTheme(theme);
        localStorage.setItem(storageKey, normalizedTheme);
        setTheme(normalizedTheme);
      } catch (error) {
        console.warn('Error saving theme:', error);
        setTheme(normalizeTheme(theme));
      }
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
