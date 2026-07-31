import type { InternalAxiosRequestConfig } from 'axios';
import { DelayState } from './rate-limiter.types';
import { getRequestKey } from './get-request-key';

export function createRequestInterceptor(
  delayState: DelayState,
): (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> {
  return async (config: InternalAxiosRequestConfig) => {
    const currentRequestKey = getRequestKey({ method: config.method, url: config.url });
    if (delayState.pending && delayState.requestKey === currentRequestKey) {
      await delayState.pending;
    }

    return config;
  };
}
