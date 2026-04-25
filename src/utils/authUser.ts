import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { User, UserPreferences, UserRole } from '../types';
import type { UserDB } from '../types/database';

export const defaultAuthPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    push: true,
    email: true,
    sms: false,
    marketing: false,
  },
  privacy: {
    showProfile: true,
    showActivity: false,
  },
  display: {
    currency: 'GHS',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
  },
};

export const getAuthMetadataValue = (
  authUser: SupabaseAuthUser,
  key: string
): string | undefined => {
  const value = authUser.user_metadata?.[key];
  return typeof value === 'string' ? value : undefined;
};

export const buildAuthDisplayName = (authUser: SupabaseAuthUser): string => {
  const fullName =
    getAuthMetadataValue(authUser, 'full_name') ||
    getAuthMetadataValue(authUser, 'name') ||
    [getAuthMetadataValue(authUser, 'given_name'), getAuthMetadataValue(authUser, 'family_name')]
      .filter(Boolean)
      .join(' ')
      .trim();

  return fullName || authUser.email?.split('@')[0] || 'PropertyHub User';
};

export const buildAuthAvatar = (authUser: SupabaseAuthUser): string | undefined =>
  getAuthMetadataValue(authUser, 'avatar_url') || getAuthMetadataValue(authUser, 'picture');

export const buildAuthRole = (authUser: SupabaseAuthUser): UserRole | undefined => {
  const role = getAuthMetadataValue(authUser, 'role');
  return role?.trim() || undefined;
};

export const mapSupabaseUserToAppUser = (
  authUser: SupabaseAuthUser,
  profile?: Partial<UserDB> | null,
  preferredRole?: UserRole
): User => ({
  id: authUser.id,
  email: profile?.email || authUser.email || '',
  name: profile?.name || buildAuthDisplayName(authUser),
  role: profile?.role || preferredRole || buildAuthRole(authUser) || 'user',
  status: profile?.status,
  avatar: profile?.avatar || buildAuthAvatar(authUser),
  verified: profile?.verified ?? Boolean(authUser.email_confirmed_at),
  preferences:
    (profile?.preferences as User['preferences'] | undefined) || defaultAuthPreferences,
  bio: profile?.bio,
  phone: profile?.phone,
  createdAt: profile?.created_at || authUser.created_at,
  updatedAt: profile?.updated_at,
  lastLoginAt: profile?.last_login_at || authUser.last_sign_in_at,
  joinedAt: profile?.created_at || authUser.created_at,
  emailVerified: Boolean(authUser.email_confirmed_at) || profile?.verified,
});
