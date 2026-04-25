import { envConfig } from '../utils/envConfig';

const BACKEND_BASE_URL = (envConfig.API_URL || 'http://localhost:8080').replace(/\/$/, '');

const AUTH_TOKEN_KEYS = [
  'auth_token',
  'propertyhub_auth_token',
  'supabase.auth.token',
] as const;

const tryExtractToken = (rawValue: string | null): string | null => {
  if (!rawValue || rawValue.trim().length === 0) return null;

  const value = rawValue.trim();

  // Handle plain bearer tokens.
  if (value.split('.').length === 3 || value.startsWith('sbp_') || value.startsWith('eyJ')) {
    return value;
  }

  // Handle serialized auth payloads.
  try {
    const parsed = JSON.parse(value);

    if (typeof parsed?.access_token === 'string') {
      return parsed.access_token;
    }

    if (typeof parsed?.currentSession?.access_token === 'string') {
      return parsed.currentSession.access_token;
    }
  } catch {
    // Ignore non-JSON values.
  }

  return null;
};

export const getBackendAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  for (const key of AUTH_TOKEN_KEYS) {
    const token = tryExtractToken(localStorage.getItem(key));
    if (token) return token;
  }

  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key) continue;
    if (!key.includes('auth-token') && !key.includes('supabase')) continue;

    const token = tryExtractToken(localStorage.getItem(key));
    if (token) return token;
  }

  return null;
};

interface BackendRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

const buildUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  return `${BACKEND_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

const parseResponse = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const backendApiRequest = async <T = any>(
  endpoint: string,
  options: BackendRequestOptions = {}
): Promise<T> => {
  const { skipAuth = false, headers, ...restOptions } = options;
  const resolvedHeaders = new Headers(headers || {});

  if (!resolvedHeaders.has('Content-Type') && restOptions.body && !(restOptions.body instanceof FormData)) {
    resolvedHeaders.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getBackendAuthToken();
    if (token && !resolvedHeaders.has('Authorization')) {
      resolvedHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(buildUrl(endpoint), {
    ...restOptions,
    headers: resolvedHeaders,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Backend request failed (${response.status}) for ${endpoint}`;
    throw new Error(message);
  }

  return (payload?.data ?? payload) as T;
};

export const backendBaseUrl = BACKEND_BASE_URL;
