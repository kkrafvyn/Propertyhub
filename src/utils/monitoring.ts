import { envConfig } from './envConfig';

export type MonitoringEventType = 'error_batch' | 'webhook_security' | 'analytics';

export interface MonitoringEvent {
  type: MonitoringEventType;
  name: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const canUseBeacon = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';

export const isMonitoringConfigured = (): boolean => Boolean(envConfig.MONITORING_ENDPOINT);

export const sendMonitoringEvent = async (event: MonitoringEvent): Promise<boolean> => {
  if (typeof window === 'undefined' || !envConfig.MONITORING_ENDPOINT) {
    return false;
  }

  const body = JSON.stringify(event);

  try {
    if (canUseBeacon()) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(envConfig.MONITORING_ENDPOINT, blob)) {
        return true;
      }
    }

    const response = await fetch(envConfig.MONITORING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: true,
    });

    return response.ok;
  } catch (error) {
    if (envConfig.isDevelopment) {
      console.warn('Failed to send monitoring event:', error);
    }
    return false;
  }
};

export const sendMonitoringBatch = async (
  name: string,
  events: Array<Record<string, unknown>>
): Promise<boolean> =>
  sendMonitoringEvent({
    type: 'error_batch',
    name,
    payload: {
      events,
      count: events.length,
    },
    timestamp: new Date().toISOString(),
  });
