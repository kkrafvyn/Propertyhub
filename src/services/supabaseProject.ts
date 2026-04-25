const fallbackProjectId = 'jcubushzzltoqpueojub';
const fallbackPublicAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdWJ1c2h6emx0b3FwdWVvanViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDgwMTAsImV4cCI6MjA3MTAyNDAxMH0.MWOqPYTuEO69bVIs71doZHKDExFHW8QLKp3gY1vmTAY';
const fallbackEdgeFunctionName = 'server/make-server-8669f8c6';

const configuredProjectId =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ||
  import.meta.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0];

export const projectId = configuredProjectId || fallbackProjectId;
export const publicAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  fallbackPublicAnonKey;
export const edgeFunctionName =
  import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_NAME || fallbackEdgeFunctionName;
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
export const supabaseFunctionsBaseUrl = `${supabaseUrl}/functions/v1/${edgeFunctionName}`;

export const getSupabaseFunctionUrl = (path = '') => {
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedPath ? `${supabaseFunctionsBaseUrl}/${normalizedPath}` : supabaseFunctionsBaseUrl;
};
