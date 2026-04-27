import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  BiometryType,
  type CheckBiometryResult,
} from '@aparajita/capacitor-biometric-auth';

export type BiometricAvailability = {
  available: boolean;
  biometryLabel: string;
  biometryType: BiometryType;
  code?: BiometryErrorType;
  deviceSecure: boolean;
  platform: string;
  reason?: string;
  strongBiometryAvailable: boolean;
  supported: boolean;
};

export type BiometricPromptOptions = {
  allowDeviceCredential?: boolean;
  reason?: string;
};

const resolveBiometryLabel = (type: BiometryType): string => {
  switch (type) {
    case BiometryType.faceId:
      return 'Face ID';
    case BiometryType.touchId:
      return 'Touch ID';
    case BiometryType.faceAuthentication:
      return 'Face authentication';
    case BiometryType.fingerprintAuthentication:
      return 'Fingerprint authentication';
    case BiometryType.irisAuthentication:
      return 'Iris authentication';
    default:
      return 'Biometric authentication';
  }
};

const normalizeAvailability = (
  result: CheckBiometryResult,
): BiometricAvailability => ({
  available: result.isAvailable,
  biometryLabel: resolveBiometryLabel(result.biometryType),
  biometryType: result.biometryType,
  code: result.code || undefined,
  deviceSecure: result.deviceIsSecure,
  platform: Capacitor.getPlatform(),
  reason: result.reason || undefined,
  strongBiometryAvailable: result.strongBiometryIsAvailable,
  supported: result.biometryType !== BiometryType.none || result.deviceIsSecure,
});

export const isBiometricAuthSupported = (): boolean => Capacitor.isNativePlatform();

export const getBiometricAvailability = async (): Promise<BiometricAvailability> => {
  if (!isBiometricAuthSupported()) {
    return {
      available: false,
      biometryLabel: 'Biometric authentication',
      biometryType: BiometryType.none,
      deviceSecure: false,
      platform: Capacitor.getPlatform(),
      strongBiometryAvailable: false,
      supported: false,
    };
  }

  const result = await BiometricAuth.checkBiometry();
  return normalizeAvailability(result);
};

export const authenticateWithBiometrics = async (
  options: BiometricPromptOptions = {},
): Promise<{ success: true } | { code?: BiometryErrorType; error: string; success: false }> => {
  if (!isBiometricAuthSupported()) {
    return {
      success: false,
      error: 'Biometric authentication is only available on native iOS and Android builds.',
    };
  }

  try {
    await BiometricAuth.authenticate({
      reason: options.reason || 'Confirm your identity to continue.',
      cancelTitle: 'Not now',
      allowDeviceCredential: options.allowDeviceCredential ?? true,
      iosFallbackTitle: 'Use passcode',
      androidTitle: 'Unlock PropertyHub',
      androidSubtitle: 'Use biometrics to continue',
      androidConfirmationRequired: false,
      androidBiometryStrength: AndroidBiometryStrength.weak,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof BiometryError) {
      return {
        success: false,
        code: error.code,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Biometric authentication failed.',
    };
  }
};

export const addBiometricResumeListener = async (
  listener: (availability: BiometricAvailability) => void,
): Promise<PluginListenerHandle | null> => {
  if (!isBiometricAuthSupported()) {
    return null;
  }

  await BiometricAuth.checkBiometry();
  return BiometricAuth.addResumeListener((result) => {
    listener(normalizeAvailability(result));
  });
};
