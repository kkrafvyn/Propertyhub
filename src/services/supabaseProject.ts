const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const configuredProjectId =
  import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim() ||
  configuredSupabaseUrl.replace(/^https?:\/\//, '').split('.')[0] ||
  '';
const configuredPublicAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  '';
const defaultEdgeFunctionName = 'server/make-server-8669f8c6';

export const projectId = configuredProjectId;
export const publicAnonKey = configuredPublicAnonKey;
export const edgeFunctionName =
  import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_NAME?.trim() || defaultEdgeFunctionName;
export const supabaseUrl = configuredSupabaseUrl;
export const supabaseFunctionsBaseUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/${edgeFunctionName}`
  : '';

export const getSupabaseFunctionUrl = (path = '') => {
  if (!supabaseFunctionsBaseUrl) return '';

  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedPath
    ? `${supabaseFunctionsBaseUrl}/${normalizedPath}`
    : supabaseFunctionsBaseUrl;
};
