import type { AppState, User } from '../types';
import {
  canAccessAppState,
  getRoleWorkspace,
  type RoleNavigationItem,
} from './roleCapabilities';

export interface NavigationItem extends RoleNavigationItem {}

export interface ParsedAppRoute {
  appState: AppState;
  propertyId?: string;
}

const AUTH_STATES = new Set<AppState>(['auth-landing', 'login', 'signup']);

const routeMap: Partial<Record<AppState, string>> = {
  splash: '/splash',
  'auth-landing': '/auth',
  login: '/login',
  signup: '/signup',
  main: '/',
  marketplace: '/',
  dashboard: '/dashboard',
  admin: '/admin',
  profile: '/profile',
  chat: '/chat',
  map: '/map',
  payments: '/payments/callback',
  billing: '/settings/billing',
  help: '/help',
  privacy: '/settings/privacy',
  'profile-settings': '/settings',
  'property-management': '/properties/manage',
  directions: '/directions',
  'tour-scheduler': '/tours/schedule',
  'offline-maps': '/maps/offline',
};

const normalizePath = (pathname: string): string => {
  if (!pathname) return '/';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.length ? normalized : '/';
};

export const getPathForState = (
  appState: AppState,
  options?: {
    selectedPropertyId?: string | null;
  }
): string => {
  if (options?.selectedPropertyId) {
    return `/properties/${encodeURIComponent(options.selectedPropertyId)}`;
  }

  return routeMap[appState] || '/';
};

export const parseAppRoute = (pathname: string): ParsedAppRoute => {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath.startsWith('/properties/')) {
    const propertyId = decodeURIComponent(normalizedPath.replace('/properties/', ''));

    if (propertyId === 'manage') {
      return { appState: 'property-management' };
    }

    return {
      appState: 'property-details',
      propertyId,
    };
  }

  switch (normalizedPath) {
    case '/splash':
      return { appState: 'splash' };
    case '/auth':
      return { appState: 'auth-landing' };
    case '/login':
      return { appState: 'login' };
    case '/signup':
      return { appState: 'signup' };
    case '/dashboard':
      return { appState: 'dashboard' };
    case '/admin':
      return { appState: 'admin' };
    case '/profile':
      return { appState: 'profile' };
    case '/chat':
      return { appState: 'chat' };
    case '/map':
      return { appState: 'map' };
    case '/payments/callback':
      return { appState: 'payments' };
    case '/settings':
      return { appState: 'profile-settings' };
    case '/settings/billing':
      return { appState: 'billing' };
    case '/settings/privacy':
      return { appState: 'privacy' };
    case '/help':
      return { appState: 'help' };
    case '/directions':
      return { appState: 'directions' };
    case '/tours/schedule':
      return { appState: 'tour-scheduler' };
    case '/maps/offline':
      return { appState: 'offline-maps' };
    case '/':
    default:
      return { appState: 'main' };
  }
};

export const resolveRouteStateForUser = (
  route: ParsedAppRoute,
  currentUser: User | null
): AppState => {
  if (!currentUser) {
    return AUTH_STATES.has(route.appState) ? route.appState : 'auth-landing';
  }

  const normalizedState = route.appState === 'property-details' ? 'main' : route.appState;

  if (AUTH_STATES.has(normalizedState) || normalizedState === 'splash') {
    return getRoleWorkspace(currentUser).homeState;
  }

  return canAccessAppState(currentUser, normalizedState)
    ? normalizedState
    : getRoleWorkspace(currentUser).homeState;
};

export const getPrimaryNavigation = (role: User['role'] | undefined): NavigationItem[] =>
  getRoleWorkspace(role).navigation;

export const getHomeStateForRole = (role: User['role'] | undefined): AppState =>
  getRoleWorkspace(role).homeState;

export const isNavigationItemActive = (appState: AppState, itemId: AppState): boolean => {
  if (itemId === 'marketplace' && appState === 'main') return true;
  if (
    itemId === 'profile-settings' &&
    new Set<AppState>(['profile-settings', 'billing', 'privacy', 'help']).has(appState)
  ) {
    return true;
  }
  return appState === itemId;
};
