import React from 'react';
import { Contrast, Monitor, MoonStar, SunMedium } from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { themeOptions } from '../utils/theme';
import type { Theme } from '../types';
import { cn } from './ui/utils';

interface ThemeSelectorProps {
  className?: string;
}

const previewSwatches: Record<Exclude<Theme, 'system'>, string[]> = {
  light: ['#f3eee2', '#fffaf2', '#55624d'],
  dark: ['#171410', '#2a231b', '#a3ab7d'],
  'high-contrast': ['#050505', '#11100d', '#c8aa64'],
};

const themeIcons: Record<Theme, React.ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: SunMedium,
  dark: MoonStar,
  'high-contrast': Contrast,
};

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, setTheme } = useAppContext();

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {themeOptions.map((option) => {
        const Icon = themeIcons[option.value];
        const isActive = theme === option.value;
        const swatches =
          option.value === 'system'
            ? [previewSwatches.light[0], previewSwatches.dark[0], previewSwatches['high-contrast'][2]]
            : previewSwatches[option.value];

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              'group air-surface rounded-[26px] p-4 text-left transition-all',
              isActive
                ? 'theme-accent-badge shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_12%,transparent)]'
                : 'hover:bg-secondary/75'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                {swatches.map((swatch) => (
                  <span
                    key={`${option.value}-${swatch}`}
                    className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-foreground">{option.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSelector;
