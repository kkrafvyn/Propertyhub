import type { UserRole } from '../types';

export const PENDING_OAUTH_ROLE_KEY = 'propertyHubOAuthRole';

export const storePendingOAuthRole = (role?: UserRole): void => {
  if (typeof window === 'undefined') return;

  if (role) {
    window.localStorage.setItem(PENDING_OAUTH_ROLE_KEY, role);
    return;
  }

  window.localStorage.removeItem(PENDING_OAUTH_ROLE_KEY);
};

export const consumePendingOAuthRole = (): UserRole | undefined => {
  if (typeof window === 'undefined') return undefined;

  const role = window.localStorage.getItem(PENDING_OAUTH_ROLE_KEY);
  window.localStorage.removeItem(PENDING_OAUTH_ROLE_KEY);

  return role || undefined;
};
