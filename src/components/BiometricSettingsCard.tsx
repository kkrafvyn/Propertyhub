import React from 'react';
import { Fingerprint, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { authenticateWithBiometrics, addBiometricResumeListener, getBiometricAvailability, isBiometricAuthSupported, type BiometricAvailability } from '../services/biometricAuth';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

export type BiometricSettingsValue = {
  allowDeviceCredentials: boolean;
  biometryType?: string;
  enabled: boolean;
  lastVerifiedAt?: string;
  promptOnLaunch: boolean;
};

interface BiometricSettingsCardProps {
  value: BiometricSettingsValue;
  onChange: (nextValue: BiometricSettingsValue) => void;
}

const formatBiometricTimestamp = (value?: string): string => {
  if (!value) return 'Not verified yet';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

export function BiometricSettingsCard({ value, onChange }: BiometricSettingsCardProps) {
  const [availability, setAvailability] = React.useState<BiometricAvailability | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isVerifying, setIsVerifying] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    let resumeHandlePromise: Promise<{ remove: () => Promise<void> } | null> | null = null;

    const syncAvailability = async () => {
      if (!isBiometricAuthSupported()) {
        if (isMounted) {
          setAvailability(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const result = await getBiometricAvailability();
        if (isMounted) {
          setAvailability(result);
        }
      } catch (error) {
        console.error('Failed to read biometric availability:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void syncAvailability();
    resumeHandlePromise = addBiometricResumeListener((result) => {
      if (isMounted) {
        setAvailability(result);
      }
    });

    return () => {
      isMounted = false;
      if (resumeHandlePromise) {
        void resumeHandlePromise.then((handle) => handle?.remove());
      }
    };
  }, []);

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!enabled) {
      onChange({
        ...value,
        enabled: false,
      });
      return;
    }

    if (!availability?.supported) {
      toast.error('Biometric authentication is not available on this device.');
      return;
    }

    setIsVerifying(true);

    const result = await authenticateWithBiometrics({
      allowDeviceCredential: value.allowDeviceCredentials,
      reason: 'Confirm your identity to enable biometric unlock for PropertyHub.',
    });

    setIsVerifying(false);

    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    const verifiedAt = new Date().toISOString();
    onChange({
      ...value,
      biometryType: availability.biometryLabel,
      enabled: true,
      lastVerifiedAt: verifiedAt,
    });
    toast.success(`${availability.biometryLabel} is ready on this device.`);
  };

  const handleBiometricTest = async () => {
    setIsVerifying(true);
    const result = await authenticateWithBiometrics({
      allowDeviceCredential: value.allowDeviceCredentials,
      reason: 'Verify your identity to test biometric unlock.',
    });
    setIsVerifying(false);

    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    onChange({
      ...value,
      biometryType: availability?.biometryLabel || value.biometryType,
      lastVerifiedAt: new Date().toISOString(),
    });
    toast.success('Biometric check passed.');
  };

  const statusLabel = !isBiometricAuthSupported()
    ? 'Native build required'
    : isLoading
      ? 'Checking device support...'
      : availability?.available
        ? `${availability.biometryLabel} available`
        : availability?.deviceSecure
          ? 'Device credentials available'
          : availability?.reason || 'Not available on this device';

  return (
    <div className="mt-6 air-surface rounded-[28px] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
              <Fingerprint className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Biometric unlock</h3>
              <p className="text-sm text-muted-foreground">
                Use Face ID, Touch ID, fingerprint, or device credentials on supported mobile builds.
              </p>
            </div>
          </div>

          <div className="theme-info-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold">
            {statusLabel}
          </div>
        </div>

        <Switch
          checked={value.enabled}
          disabled={isLoading || isVerifying || !isBiometricAuthSupported()}
          onCheckedChange={(checked) => {
            void handleBiometricToggle(checked);
          }}
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="air-surface-muted rounded-[24px] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Prompt on app open</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask for biometrics when the mobile app is reopened on this device.
              </p>
            </div>
            <Switch
              checked={value.promptOnLaunch}
              disabled={!value.enabled}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  promptOnLaunch: checked,
                })
              }
            />
          </div>
        </div>

        <div className="air-surface-muted rounded-[24px] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Allow device passcode</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Fall back to the phone PIN or passcode if biometric matching fails.
              </p>
            </div>
            <Switch
              checked={value.allowDeviceCredentials}
              disabled={!isBiometricAuthSupported()}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  allowDeviceCredentials: checked,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="air-surface rounded-[24px] p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-semibold">Last biometric check</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {formatBiometricTimestamp(value.lastVerifiedAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="air-surface rounded-[24px] p-4">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-semibold">Preferred unlock method</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {value.biometryType || availability?.biometryLabel || 'Automatic'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={!availability?.supported || isVerifying}
          onClick={() => {
            void handleBiometricTest();
          }}
          className="rounded-full"
        >
          {isVerifying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
          Test biometric unlock
        </Button>
      </div>
    </div>
  );
}

export default BiometricSettingsCard;
