/**
 * React Native Paper Theme Configuration
 * 
 * Custom theme based on Material Design 3 for PropertyHub mobile app
 */

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#667eea',
    primaryContainer: '#e8f2ff',
    secondary: '#764ba2',
    secondaryContainer: '#f3e8ff',
    tertiary: '#22c55e',
    tertiaryContainer: '#dcfce7',
    surface: '#ffffff',
    surfaceVariant: '#f8fafc',
    background: '#f5f5f5',
    error: '#dc2626',
    errorContainer: '#fef2f2',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onTertiary: '#ffffff',
    onSurface: '#1f2937',
    onSurfaceVariant: '#6b7280',
    onBackground: '#1f2937',
    outline: '#e5e7eb',
    outlineVariant: '#f3f4f6',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#1f2937',
    inverseOnSurface: '#ffffff',
    inversePrimary: '#93c5fd',
  },
  roundness: 12,
};

export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#93c5fd',
    primaryContainer: '#1e40af',
    secondary: '#c4b5fd',
    secondaryContainer: '#6b21a8',
    tertiary: '#86efac',
    tertiaryContainer: '#166534',
    surface: '#1f2937',
    surfaceVariant: '#374151',
    background: '#111827',
    error: '#fca5a5',
    errorContainer: '#dc2626',
    onPrimary: '#1e40af',
    onSecondary: '#6b21a8',
    onTertiary: '#166534',
    onSurface: '#f9fafb',
    onSurfaceVariant: '#d1d5db',
    onBackground: '#f9fafb',
    outline: '#6b7280',
    outlineVariant: '#4b5563',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#f9fafb',
    inverseOnSurface: '#1f2937',
    inversePrimary: '#667eea',
  },
  roundness: 12,
};