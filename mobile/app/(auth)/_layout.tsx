/**
 * PropertyHub Mobile - Authentication Layout
 * 
 * Layout for authentication screens (login, signup, forgot password)
 * Provides a stack navigator for authentication flow
 */

import { Stack } from 'expo-router';
import { useTheme } from '../../src/providers/ThemeProvider';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}