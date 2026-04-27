import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import {
  Camera,
  CameraResultType,
  CameraSource,
  type ImageOptions,
} from '@capacitor/camera';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Geolocation, type PositionOptions } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
} from '@capacitor/push-notifications';
import { Share } from '@capacitor/share';
import type { LocationData } from '../types';

export type NativePushPayload = {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};

export type ScheduledNativeNotification = NativePushPayload & {
  id: number;
  at: Date;
};

export type NativePushRegistration = {
  token: string;
  platform: string;
  dispose: () => Promise<void>;
};

type CameraInputSource = 'camera' | 'photos' | 'prompt';

const DEFAULT_LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 300000,
};

const PHOTO_MIME_BY_FORMAT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
};

const NOTIFICATION_CHANNEL_ID = 'propertyhub-general';

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();
export const nativePlatform = (): string => Capacitor.getPlatform();
export const isAndroid = (): boolean => nativePlatform() === 'android';
export const isIOS = (): boolean => nativePlatform() === 'ios';

const toLocationData = (position: {
  coords: { latitude: number; longitude: number; accuracy?: number | null };
  timestamp: number;
}): LocationData => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy ?? undefined,
  timestamp: position.timestamp,
});

const base64ToBlob = (base64Data: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let index = 0; index < byteCharacters.length; index += 1) {
    byteNumbers[index] = byteCharacters.charCodeAt(index);
  }

  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
};

const sanitizeFileName = (value: string): string =>
  value.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const buildPhotoFile = async (
  photo: { webPath?: string; dataUrl?: string; format?: string },
  baseName = 'capture'
): Promise<File> => {
  const extension = (photo.format || 'jpeg').toLowerCase();
  const mimeType = PHOTO_MIME_BY_FORMAT[extension] || 'image/jpeg';
  const safeName = sanitizeFileName(`${baseName}-${Date.now()}.${extension}`);

  if (photo.webPath) {
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    return new File([blob], safeName, {
      type: blob.type || mimeType,
      lastModified: Date.now(),
    });
  }

  if (photo.dataUrl) {
    const [, encodedData = ''] = photo.dataUrl.split(',');
    const blob = base64ToBlob(encodedData, mimeType);
    return new File([blob], safeName, {
      type: mimeType,
      lastModified: Date.now(),
    });
  }

  throw new Error('Unable to read captured media.');
};

const resolveCameraSource = (source: CameraInputSource): CameraSource => {
  if (source === 'camera') return CameraSource.Camera;
  if (source === 'photos') return CameraSource.Photos;
  return CameraSource.Prompt;
};

export const captureImageFile = async (
  source: CameraInputSource = 'prompt',
  options: Partial<ImageOptions> = {}
): Promise<File> => {
  const photo = await Camera.getPhoto({
    quality: options.quality ?? 90,
    allowEditing: options.allowEditing ?? false,
    resultType: CameraResultType.Uri,
    source: resolveCameraSource(source),
    correctOrientation: true,
    webUseInput: true,
    width: options.width,
    height: options.height,
    saveToGallery: false,
  });

  return buildPhotoFile(photo, source === 'camera' ? 'camera' : 'photo');
};

export const getNotificationPermissionState = async (): Promise<string> => {
  if (isNativePlatform()) {
    const permissionState = await PushNotifications.checkPermissions();
    return permissionState.receive;
  }

  if (typeof Notification === 'undefined') {
    return 'denied';
  }

  return Notification.permission;
};

export const ensurePushPermission = async (): Promise<boolean> => {
  if (isNativePlatform()) {
    let permissionState = await PushNotifications.checkPermissions();
    if (permissionState.receive === 'prompt') {
      permissionState = await PushNotifications.requestPermissions();
    }

    if (permissionState.receive !== 'granted') {
      return false;
    }

    const localPermissionState = await LocalNotifications.checkPermissions();
    if (localPermissionState.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    return true;
  }

  if (typeof Notification === 'undefined') {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permissionState = await Notification.requestPermission();
  return permissionState === 'granted';
};

export const ensureNotificationChannel = async (): Promise<void> => {
  if (!isAndroid()) {
    return;
  }

  await PushNotifications.createChannel({
    id: NOTIFICATION_CHANNEL_ID,
    name: 'PropertyHub Alerts',
    description: 'Chat, booking, and system notifications',
    importance: 4,
    visibility: 1,
    vibration: true,
  });
};

export const registerNativePush = async (options: {
  onToken?: (token: string) => void;
  onNotification?: (notification: PushNotificationSchema) => void;
  onAction?: (action: ActionPerformed) => void;
  onError?: (error: Error) => void;
} = {}): Promise<NativePushRegistration> => {
  if (!isNativePlatform()) {
    throw new Error('Native push registration is only available on Capacitor builds.');
  }

  const allowed = await ensurePushPermission();
  if (!allowed) {
    throw new Error('Push notification permission was denied.');
  }

  await ensureNotificationChannel();

  const listenerHandles: PluginListenerHandle[] = [];

  let resolveToken: (token: string) => void;
  let rejectToken: (error: Error) => void;

  const tokenPromise = new Promise<string>((resolve, reject) => {
    resolveToken = resolve;
    rejectToken = reject;
  });

  listenerHandles.push(
    await PushNotifications.addListener('registration', (token) => {
      options.onToken?.(token.value);
      resolveToken(token.value);
    })
  );

  listenerHandles.push(
    await PushNotifications.addListener('registrationError', (error) => {
      const nextError = new Error(error.error || 'Push registration failed.');
      options.onError?.(nextError);
      rejectToken(nextError);
    })
  );

  listenerHandles.push(
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      options.onNotification?.(notification);
    })
  );

  listenerHandles.push(
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      options.onAction?.(action);
    })
  );

  await PushNotifications.register();
  const token = await tokenPromise;

  return {
    token,
    platform: nativePlatform(),
    dispose: async () => {
      await Promise.all(listenerHandles.map((handle) => handle.remove()));
    },
  };
};

export const unregisterNativePush = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }

  await PushNotifications.unregister();
  await PushNotifications.removeAllDeliveredNotifications();
};

export const showLocalNotification = async (
  payload: NativePushPayload & { id?: number }
): Promise<void> => {
  const allowed = await ensurePushPermission();
  if (!allowed) {
    return;
  }

  await ensureNotificationChannel();

  await LocalNotifications.schedule({
    notifications: [
      {
        id: payload.id ?? Date.now(),
        title: payload.title || 'PropertyHub',
        body: payload.body || '',
        extra: payload.data || {},
        channelId: NOTIFICATION_CHANNEL_ID,
        schedule: { at: new Date(Date.now() + 150) },
      },
    ],
  });
};

export const scheduleLocalNotifications = async (
  notifications: ScheduledNativeNotification[]
): Promise<void> => {
  if (notifications.length === 0) {
    return;
  }

  const allowed = await ensurePushPermission();
  if (!allowed) {
    return;
  }

  await ensureNotificationChannel();

  await LocalNotifications.schedule({
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title || 'PropertyHub',
      body: notification.body || '',
      extra: notification.data || {},
      channelId: NOTIFICATION_CHANNEL_ID,
      schedule: { at: notification.at },
    })),
  });
};

export const shareContent = async (payload: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<void> => {
  if (isNativePlatform()) {
    await Share.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
      dialogTitle: payload.dialogTitle,
    });
    return;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
    });
    return;
  }

  if (payload.url && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload.url);
    return;
  }

  throw new Error('Sharing is not available on this device.');
};

export const openExternalUrl = async (url: string): Promise<void> => {
  if (isNativePlatform()) {
    await Browser.open({ url });
    return;
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const getCurrentLocation = async (
  options: PositionOptions = DEFAULT_LOCATION_OPTIONS
): Promise<LocationData> => {
  if (isNativePlatform()) {
    const permissionState = await Geolocation.checkPermissions();
    if (
      permissionState.location !== 'granted' &&
      permissionState.coarseLocation !== 'granted'
    ) {
      const requested = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (
        requested.location !== 'granted' &&
        requested.coarseLocation !== 'granted'
      ) {
        throw new Error('Location permission was denied.');
      }
    }

    const position = await Geolocation.getCurrentPosition(options);
    return toLocationData(position);
  }

  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported on this device.');
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

  return toLocationData({
    coords: position.coords,
    timestamp: position.timestamp,
  });
};

export const watchLocation = async (
  onUpdate: (location: LocationData) => void,
  onError?: (error: Error) => void,
  options: PositionOptions = DEFAULT_LOCATION_OPTIONS
): Promise<() => void> => {
  if (isNativePlatform()) {
    const watchId = await Geolocation.watchPosition(options, (position, error) => {
      if (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      if (position) {
        onUpdate(toLocationData(position));
      }
    });

    return () => {
      void Geolocation.clearWatch({ id: watchId });
    };
  }

  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported on this device.');
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate(
        toLocationData({
          coords: position.coords,
          timestamp: position.timestamp,
        })
      );
    },
    (error) => {
      onError?.(new Error(error.message));
    },
    options
  );

  return () => navigator.geolocation.clearWatch(watchId);
};

export const addBackButtonListener = async (
  handler: () => void
): Promise<PluginListenerHandle | null> => {
  if (!isNativePlatform()) {
    return null;
  }

  return App.addListener('backButton', () => {
    handler();
  });
};
