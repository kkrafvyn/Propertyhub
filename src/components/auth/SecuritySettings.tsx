import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Check, AlertCircle, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export interface AuthenticationState {
  userId: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'email' | 'authenticator' | 'sms';
  backupCodes: string[];
  lastLogin?: Date;
  loginAttempts: number;
}

const USERS_STORAGE_KEY = 'realestate_users_auth';

// Utility functions
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateOTP = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

// Email Verification Component
export const EmailVerificationStep: React.FC<{
  email: string;
  onVerify: (email: string, otp: string) => Promise<boolean>;
  onResendOTP: () => Promise<void>;
}> = ({ email, onVerify, onResendOTP }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (otpSent) {
      setResendCountdown(60);
    }
  }, [otpSent]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerify = async () => {
    if (!validateOTP(otp)) {
      toast.error('Invalid OTP format. Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const success = await onVerify(email, otp);
      if (success) {
        toast.success('Email verified successfully!');
        setOtp('');
      } else {
        toast.error('Invalid OTP. Please try again.');
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await onResendOTP();
      setOtpSent(true);
      toast.success('OTP resent to your email');
    } catch (error) {
      toast.error('Failed to resend OTP');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          We've sent a verification code to <strong>{email}</strong>
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Verification Code</label>
          <input
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="w-full px-4 py-2 text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <Button
          onClick={handleVerify}
          disabled={otp.length !== 6 || loading}
          className="w-full"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </Button>

        {resendCountdown > 0 ? (
          <p className="text-sm text-center text-gray-600">
            Resend code in {resendCountdown}s
          </p>
        ) : (
          <Button
            variant="outline"
            onClick={handleResend}
            className="w-full"
          >
            Resend Code
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Two-Factor Authentication Setup Component
export const TwoFactorSetup: React.FC<{
  onEnable: (method: 'email' | 'authenticator' | 'sms') => Promise<boolean>;
  onDisable: () => Promise<boolean>;
  enabled: boolean;
  method?: string;
  backupCodes?: string[];
}> = ({ onEnable, onDisable, enabled, method, backupCodes: initialBackupCodes }) => {
  const [loading, setLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'authenticator' | 'sms'>('email');

  const handleEnable = async () => {
    setLoading(true);
    try {
      const success = await onEnable(selectedMethod);
      if (success) {
        toast.success(`2FA enabled via ${selectedMethod}`);
        setShowBackupCodes(true);
      }
    } catch (error) {
      toast.error('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA?')) return;

    setLoading(true);
    try {
      const success = await onDisable();
      if (success) {
        toast.success('2FA disabled');
      }
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">2FA Enabled</p>
                <p className="text-sm text-green-700">
                  Using {method || 'email'} authentication
                </p>
              </div>
            </div>

            {initialBackupCodes && (
              <>
                <button
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showBackupCodes ? 'Hide' : 'View'} Backup Codes
                </button>

                {showBackupCodes && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Save these codes in a secure place
                    </p>
                    {initialBackupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                      >
                        <code className="text-sm font-mono">{code}</code>
                        <button
                          onClick={() => copyCode(code)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {copiedCode === code ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={loading}
              className="w-full"
            >
              Disable 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add an extra layer of security to your account
            </p>

            <div className="space-y-3">
              {(['email', 'authenticator', 'sms'] as const).map((m) => (
                <label
                  key={m}
                  className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    checked={selectedMethod === m}
                    onChange={() => setSelectedMethod(m)}
                    className="w-4 h-4"
                  />
                  <span className="ml-3 font-medium capitalize text-sm">{m} Authentication</span>
                </label>
              ))}
            </div>

            <Button
              onClick={handleEnable}
              disabled={loading}
              className="w-full"
            >
              Enable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Security Settings Component
export const SecuritySettings: React.FC<{
  authState: AuthenticationState;
  onEmailVerify?: (email: string, otp: string) => Promise<boolean>;
  onResendOTP?: () => Promise<void>;
  onEnable2FA?: (method: string) => Promise<boolean>;
  onDisable2FA?: () => Promise<boolean>;
}> = ({
  authState,
  onEmailVerify,
  onResendOTP,
  onEnable2FA,
  onDisable2FA,
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'mfa' | 'backup'>('email');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Security Settings</h2>
        <p className="text-gray-600">Manage your account security and privacy</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['email', 'mfa', 'backup'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'email' ? 'Email' : tab === 'mfa' ? '2FA' : 'Backup'}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'email' && onEmailVerify && onResendOTP && (
          authState.emailVerified ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-green-600">
                  <Check className="w-6 h-6" />
                  <span className="font-medium">Email verified</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmailVerificationStep
              email="user@example.com"
              onVerify={onEmailVerify}
              onResendOTP={onResendOTP}
            />
          )
        )}

        {activeTab === 'mfa' && onEnable2FA && onDisable2FA && (
          <TwoFactorSetup
            enabled={authState.twoFactorEnabled}
            method={authState.twoFactorMethod}
            backupCodes={authState.backupCodes}
            onEnable={onEnable2FA}
            onDisable={onDisable2FA}
          />
        )}

        {activeTab === 'backup' && (
          <Card>
            <CardHeader>
              <CardTitle>Backup Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {authState.backupCodes && authState.backupCodes.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    You can use these codes to access your account if you lose access to your authentication method
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700">
                      Each code can only be used once. Store them in a safe place.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Enable 2FA to generate backup codes
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default SecuritySettings;
