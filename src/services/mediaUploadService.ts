import { envConfig } from '../utils/envConfig';
import { getBackendAuthToken } from './backendApi';

export interface UploadedMediaAsset {
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  size?: number;
}

type UploadOptions = {
  endpointCandidates?: string[];
  extraFields?: Record<string, string>;
};

const DEFAULT_UPLOAD_ENDPOINTS = ['/api/v1/media/upload', '/api/upload'];

const parseJsonSafely = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const buildUploadHeaders = (): Headers => {
  const headers = new Headers();
  const token = getBackendAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
};

const resolveUploadUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const normalizedBase = envConfig.API_URL.replace(/\/$/, '');
  if (!normalizedBase) {
    throw new Error('Media upload backend is not configured. Set VITE_API_URL for this deployment.');
  }
  return `${normalizedBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const uploadMediaFile = async (
  file: File,
  options: UploadOptions = {}
): Promise<UploadedMediaAsset> => {
  const endpoints = options.endpointCandidates || DEFAULT_UPLOAD_ENDPOINTS;
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    Object.entries(options.extraFields || {}).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const response = await fetch(resolveUploadUrl(endpoint), {
        method: 'POST',
        headers: buildUploadHeaders(),
        body: formData,
      });

      const payload = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `Upload failed (${response.status})`);
      }

      const data = payload?.data ?? payload;
      const uploadedAsset: UploadedMediaAsset = {
        url: data?.url || data?.fileUrl,
        thumbnailUrl: data?.thumbnailUrl || data?.thumbnail_url,
        mimeType: data?.mimetype || data?.mimeType || file.type,
        size: data?.size || file.size,
      };

      if (!uploadedAsset.url) {
        throw new Error('Upload succeeded but no file URL was returned.');
      }

      return uploadedAsset;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Upload failed.');
    }
  }

  throw lastError || new Error('Upload failed.');
};
