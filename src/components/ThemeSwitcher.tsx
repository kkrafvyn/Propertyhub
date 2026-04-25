import React from 'react';
import { Contrast, Monitor, MoonStar, SunMedium } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { themeOptions } from '../utils/theme';
import type { Theme } from '../types';

interface ThemeSwitcherProps {
  className?: string;
  compact?: boolean;
}

const themeIcons: Record<Theme, React.ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: SunMedium,
  dark: MoonStar,
  'high-contrast': Contrast,
};

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className = '', compact = false }) => {
  const { theme, setTheme } = useAppContext();

  return (
    <div
      className={`wire-nav-shell flex items-center gap-1 p-1 ${className}`.trim()}
    >
      {themeOptions.map((option) => {
        const Icon = themeIcons[option.value];
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            title={option.description}
            onClick={() => setTheme(option.value)}
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all ${
              isActive
                ? 'wire-nav-link wire-nav-link-active'
                : 'wire-nav-link'
            }`}
          >
            <Icon className="h-4 w-4" />
            {!compact && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitcher;
