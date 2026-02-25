import type { InternalAxiosRequestConfig } from 'axios';
import { AuthHeadersProvider } from './auth.types';

function getHeaderValue(headers: unknown, key: string): string | undefined {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  if ('get' in headers && typeof headers.get === 'function') {
    const value = headers.get(key);
    return typeof value === 'string' ? value : undefined;
  }

  for (const [headerKey, headerValue] of Object.entries(headers as Record<string, unknown>)) {
    if (headerKey.toLowerCase() === key.toLowerCase() && typeof headerValue === 'string') {
      return headerValue;
    }
  }

  return undefined;
}

function setHeader(headers: unknown, key: string, value: string): void {
  if (!headers || typeof headers !== 'object') {
    return;
  }

  if ('set' in headers && typeof headers.set === 'function') {
    headers.set(key, value);
    return;
  }

  (headers as Record<string, string>)[key] = value;
}

export function createRequestInterceptor(
  authHeadersProvider: AuthHeadersProvider,
): (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> {
  return async (config: InternalAxiosRequestConfig) => {
    const authHeaders = await authHeadersProvider();
    const requestHeaders = config.headers ?? {};

    for (const [key, value] of Object.entries(authHeaders)) {
      if (!getHeaderValue(requestHeaders, key)) {
        setHeader(requestHeaders, key, value);
      }
    }

    config.headers = requestHeaders;
    return config;
  };
}
