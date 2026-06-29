import type { InternalAxiosRequestConfig } from 'axios';
import { DelayState } from './rate-limiter.types';

function getRequestKey(config: InternalAxiosRequestConfig) {
  const method = config.method?.toUpperCase() ?? 'GET';
  const url = config.url ?? '';

  return `${method}:${url}`;
}

export function createRequestInterceptor(
  delayState: DelayState,
): (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> {
  return async (config: InternalAxiosRequestConfig) => {
    const currentRequestKey = getRequestKey(config);
    if (delayState.pending && delayState.requestKey === currentRequestKey) {
      await delayState.pending;
    }

    return config;
  };
}
