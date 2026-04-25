import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  ChevronRight,
  Download,
  KeyRound,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import ThemeSelector from './ThemeSelector';
import { useAppContext } from '../hooks/useAppContext';
import { defaultAuthPreferences } from '../utils/authUser';
import { authService, userService } from '../services/supabaseApi';
import { isSupabaseConfigured } from '../services/supabaseClient';
import type { Language, User } from '../types';

type SettingsSectionId =
  | 'personal'
  | 'preferences'
  | 'notifications'
  | 'security'
  | 'privacy';

interface ProfileSettingsProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onClose?: () => void;
}

const formatDate = (value?: string): string => {
  if (!value) return 'Not available';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
};

const formatDateTime = (value?: string): string => {
  if (!value) return 'No recent sign-in';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

const getInitials = (name?: string): string =>
  name
    ?.split(' ')
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PH';

const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'personal',
    title: 'Personal information',
    description: 'Name, phone, and the profile details tied to your account.',
    icon: UserRound,
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Language, currency, accessibility, and theme.',
    icon: SlidersHorizontal,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Choose how PropertyHub reaches you.',
    icon: Bell,
  },
  {
    id: 'security',
    title: 'Login and security',
    description: 'Verification, password recovery, and sign-in confidence.',
    icon: ShieldCheck,
  },
  {
    id: 'privacy',
    title: 'Privacy and sharing',
    description: 'Control visibility and export your account data.',
    icon: LockKeyhole,
  },
];

export function ProfileSettings({ currentUser, onUpdateUser, onClose }: ProfileSettingsProps) {
  const {
    favoriteProperties,
    comparedProperties,
    notifications,
    reducedMotion,
    setReducedMotion,
    theme,
  } = useAppContext();

  const basePreferences = React.useMemo(
    () => ({
      ...defaultAuthPreferences,
      ...currentUser.preferences,
      notifications: {
        ...defaultAuthPreferences.notifications,
        ...currentUser.preferences?.notifications,
      },
      privacy: {
        ...defaultAuthPreferences.privacy,
        ...currentUser.preferences?.privacy,
      },
      display: {
        ...defaultAuthPreferences.display,
        ...currentUser.preferences?.display,
      },
    }),
    [currentUser.preferences]
  );

  const [profileForm, setProfileForm] = React.useState({
    name: currentUser.name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    bio: currentUser.bio || '',
  });
  const [preferenceForm, setPreferenceForm] = React.useState({
    language: basePreferences.language,
    currency: basePreferences.display.currency,
  });
  const [notificationForm, setNotificationForm] = React.useState({
    push: basePreferences.notifications.push,
    email: basePreferences.notifications.email,
    marketing: basePreferences.notifications.marketing,
  });
  const [privacyForm, setPrivacyForm] = React.useState({
    showProfile: basePreferences.privacy.showProfile,
    readReceipts: basePreferences.privacy.showActivity,
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [securityAction, setSecurityAction] = React.useState<'reset' | 'verify' | null>(null);

  const memberSince = currentUser.joinedAt || currentUser.createdAt;
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const scrollToSection = (sectionId: SettingsSectionId) => {
    if (typeof document === 'undefined') return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateProfileField = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSaveChanges = async () => {
    const trimmedName = profileForm.name.trim();

    if (!trimmedName) {
      toast.error('Name is required.');
      return;
    }

    const nextPreferences = {
      ...basePreferences,
      theme,
      language: preferenceForm.language,
      notifications: {
        ...basePreferences.notifications,
        push: notificationForm.push,
        email: notificationForm.email,
        marketing: notificationForm.marketing,
      },
      privacy: {
        ...basePreferences.privacy,
        showProfile: privacyForm.showProfile,
        showActivity: privacyForm.readReceipts,
      },
      display: {
        ...basePreferences.display,
        currency: preferenceForm.currency,
      },
    };

    const updatedUser: User = {
      ...currentUser,
      name: trimmedName,
      phone: profileForm.phone.trim() || undefined,
      bio: profileForm.bio.trim() || undefined,
      preferences: nextPreferences,
    };

    try {
      setIsSaving(true);

      if (isSupabaseConfigured()) {
        const { error } = await userService.updateProfile(currentUser.id, {
          name: updatedUser.name,
          phone: updatedUser.phone,
          bio: updatedUser.bio,
          preferences: nextPreferences as Record<string, unknown>,
        });

        if (error) throw error;
      }

      await Promise.resolve(onUpdateUser(updatedUser));
      toast.success('Settings updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save settings right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      const exportPayload = {
        profile: {
          id: currentUser.id,
          name: profileForm.name.trim(),
          email: profileForm.email,
          phone: profileForm.phone.trim(),
          bio: profileForm.bio.trim(),
          role: currentUser.role,
          verified: currentUser.verified,
          joinedAt: currentUser.joinedAt || currentUser.createdAt,
        },
        preferences: {
          theme,
          language: preferenceForm.language,
          currency: preferenceForm.currency,
          reducedMotion,
          notifications: notificationForm,
          privacy: privacyForm,
        },
        exportedAt: new Date().toISOString(),
      };

      const fileBlob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const objectUrl = URL.createObjectURL(fileBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = objectUrl;
      downloadLink.download = `propertyhub-settings-${currentUser.id}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(objectUrl);

      toast.success('Your settings export is ready.');
    } catch (error) {
      toast.error('Unable to export your data right now.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setSecurityAction('reset');
      const { error } = await authService.sendPasswordReset(profileForm.email);
      if (error) throw error;
      toast.success('Password reset email sent.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to send a password reset email.'
      );
    } finally {
      setSecurityAction(null);
    }
  };

  const handleVerificationResend = async () => {
    try {
      setSecurityAction('verify');
      const { error } = await authService.resendSignupVerification(profileForm.email);
      if (error) throw error;
      toast.success('Verification email sent.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to resend verification email.'
      );
    } finally {
      setSecurityAction(null);
    }
  };

  return (
    <div className="theme-page-shell relative min-h-[100dvh] overflow-x-hidden pb-28 lg:pb-12">
      <div className="theme-page-glow absolute inset-0" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <header className="air-panel rounded-[34px] px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                {onClose ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="w-fit"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : null}

                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Settings</h1>
              </div>

              <Button
                type="button"
                onClick={() => void handleSaveChanges()}
                disabled={isSaving}
                className="btn-primary h-12 rounded-full px-6 text-sm font-semibold"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </header>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div className="air-panel rounded-[34px] p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <Avatar className="h-24 w-24 rounded-[28px] border border-border/80">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="text-xl font-semibold">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h2 className="truncate text-2xl font-semibold">{currentUser.name}</h2>
                    <p className="truncate text-sm text-muted-foreground">{currentUser.email}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="theme-success-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                      {currentUser.verified ? 'Verified profile' : 'Verification pending'}
                    </span>
                    <span className="theme-info-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize">
                      {currentUser.role} account
                    </span>
                    <span className="air-pill rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground">
                      Member since {formatDate(memberSince)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="air-surface-muted rounded-[24px] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Saved homes
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{favoriteProperties.length}</div>
                </div>
                <div className="air-surface-muted rounded-[24px] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    In compare
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{comparedProperties.length}</div>
                </div>
                <div className="air-surface-muted rounded-[24px] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Unread alerts
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{unreadNotifications}</div>
                </div>
                <div className="air-surface-muted rounded-[24px] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Reviews given
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {currentUser.stats?.reviewsGiven || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="air-panel rounded-[34px] p-6 sm:p-8">
              <div className="grid gap-3">
                {SETTINGS_SECTIONS.map((section) => {
                  const Icon = section.icon;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className="air-surface flex items-center gap-4 rounded-[24px] px-4 py-4 text-left transition-colors hover:bg-secondary/80"
                    >
                      <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold">{section.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-8">
            <aside className="hidden lg:block">
              <div className="air-panel sticky top-28 rounded-[28px] p-3">
                {SETTINGS_SECTIONS.map((section) => {
                  const Icon = section.icon;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className="flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary/80"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{section.title}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="space-y-6">
              <section
                id="personal"
                className="air-panel scroll-mt-28 rounded-[32px] p-6 sm:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <h2 className="text-2xl font-semibold">Personal information</h2>
                    </div>
                  </div>
                  <span className="theme-success-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                    {currentUser.emailVerified ? 'Email confirmed' : 'Needs verification'}
                  </span>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Preferred name</span>
                    <Input
                      value={profileForm.name}
                      onChange={(event) => updateProfileField('name', event.target.value)}
                      placeholder="Your name"
                      className="theme-input-surface h-12 rounded-[18px] border-border"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Email address</span>
                    <Input
                      value={profileForm.email}
                      readOnly
                      className="theme-input-surface h-12 rounded-[18px] border-border opacity-80"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Phone number</span>
                    <Input
                      value={profileForm.phone}
                      onChange={(event) => updateProfileField('phone', event.target.value)}
                      placeholder="Add a phone number"
                      className="theme-input-surface h-12 rounded-[18px] border-border"
                    />
                  </label>

                  <div className="air-surface-muted rounded-[24px] px-5 py-4">
                    <div className="text-sm font-medium">Profile status</div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      Visible as {privacyForm.showProfile ? 'public profile' : 'private profile'}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      {currentUser.emailVerified ? 'Email verified' : 'Email verification pending'}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Label htmlFor="profile-bio" className="text-sm font-medium">
                    About you
                  </Label>
                  <Textarea
                    id="profile-bio"
                    value={profileForm.bio}
                    onChange={(event) => updateProfileField('bio', event.target.value)}
                    placeholder="Add a short intro that helps hosts, renters, or property managers know you better."
                    className="theme-input-surface mt-2 min-h-[132px] rounded-[24px] border-border"
                    maxLength={320}
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {profileForm.bio.length}/320 characters
                  </div>
                </div>
              </section>

              <section
                id="preferences"
                className="air-panel scroll-mt-28 rounded-[32px] p-6 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                    <SlidersHorizontal className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-semibold">Preferences</h2>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={preferenceForm.language}
                      onValueChange={(value) =>
                        setPreferenceForm((previous) => ({
                          ...previous,
                          language: value as Language,
                        }))
                      }
                    >
                      <SelectTrigger className="theme-input-surface h-12 rounded-[18px] border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="ga">Ga</SelectItem>
                        <SelectItem value="tw">Twi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={String(preferenceForm.currency)}
                      onValueChange={(value) =>
                        setPreferenceForm((previous) => ({ ...previous, currency: value }))
                      }
                    >
                      <SelectTrigger className="theme-input-surface h-12 rounded-[18px] border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GHS">GHS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="NGN">NGN</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6 air-surface rounded-[28px] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-semibold">Reduced motion</h3>
                    <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h3 className="text-base font-semibold">Theme</h3>
                  <ThemeSelector />
                </div>
              </section>

              <section
                id="notifications"
                className="air-panel scroll-mt-28 rounded-[32px] p-6 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                    <Bell className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-semibold">Notifications</h2>
                </div>

                <div className="mt-6 grid gap-4">
                  {[
                    {
                      key: 'push' as const,
                      title: 'Push notifications',
                      description: 'Messages, booking activity, and important account updates.',
                    },
                    {
                      key: 'email' as const,
                      title: 'Email notifications',
                      description: 'Receipts, account notices, and platform summaries.',
                    },
                    {
                      key: 'marketing' as const,
                      title: 'Marketing emails',
                      description: 'Recommendations, feature launches, and promotional offers.',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="air-surface flex items-start justify-between gap-4 rounded-[24px] px-5 py-4"
                    >
                      <div className="text-sm font-semibold">{item.title}</div>
                      <Switch
                        checked={notificationForm[item.key]}
                        onCheckedChange={(checked) =>
                          setNotificationForm((previous) => ({ ...previous, [item.key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section
                id="security"
                className="air-panel scroll-mt-28 rounded-[32px] p-6 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-semibold">Login and security</h2>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="air-surface rounded-[24px] p-5">
                    <div className="text-sm font-semibold">Verification status</div>
                    <div className="mt-4">
                      {currentUser.emailVerified ? (
                        <span className="theme-success-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                          Verified
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleVerificationResend()}
                          disabled={securityAction !== null}
                          className="rounded-full"
                        >
                          <Mail className="h-4 w-4" />
                          {securityAction === 'verify'
                            ? 'Sending...'
                            : 'Resend verification email'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="air-surface rounded-[24px] p-5">
                    <div className="text-sm font-semibold">Password recovery</div>
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handlePasswordReset()}
                        disabled={securityAction !== null}
                        className="rounded-full"
                      >
                        <KeyRound className="h-4 w-4" />
                        {securityAction === 'reset' ? 'Sending...' : 'Send password reset email'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="air-surface-muted rounded-[24px] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      Last sign-in
                    </div>
                    <div className="mt-2 text-base font-semibold">
                      {formatDateTime(currentUser.lastLoginAt || currentUser.lastLogin)}
                    </div>
                  </div>

                  <div className="air-surface-muted rounded-[24px] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      Login alerts
                    </div>
                    <div className="mt-2 text-base font-semibold">Active</div>
                  </div>
                </div>
              </section>

              <section
                id="privacy"
                className="air-panel scroll-mt-28 rounded-[32px] p-6 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="theme-accent-icon flex h-11 w-11 items-center justify-center rounded-[16px]">
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-semibold">Privacy and sharing</h2>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Profile visibility</Label>
                    <Select
                      value={privacyForm.showProfile ? 'public' : 'private'}
                      onValueChange={(value) =>
                        setPrivacyForm((previous) => ({
                          ...previous,
                          showProfile: value === 'public',
                        }))
                      }
                    >
                      <SelectTrigger className="theme-input-surface h-12 rounded-[18px] border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public profile</SelectItem>
                        <SelectItem value="private">Private profile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="air-surface rounded-[24px] px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-sm font-semibold">Read receipts</div>
                      <Switch
                        checked={privacyForm.readReceipts}
                        onCheckedChange={(checked) =>
                          setPrivacyForm((previous) => ({
                            ...previous,
                            readReceipts: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="air-surface rounded-[24px] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-sm font-semibold">Export your data</div>
                      <Download className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleExportData()}
                      disabled={isExporting}
                      className="mt-4 rounded-full"
                    >
                      <Download className="h-4 w-4" />
                      {isExporting ? 'Preparing export...' : 'Download settings'}
                    </Button>
                  </div>

                  <div className="air-surface-muted rounded-[24px] p-5">
                    <div className="text-sm font-semibold">Account closure</div>
                    <div className="mt-2 text-sm text-muted-foreground">Contact support</div>
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void handleSaveChanges()}
                  disabled={isSaving}
                  className="btn-primary h-12 rounded-full px-6 text-sm font-semibold"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save settings'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ProfileSettings;
