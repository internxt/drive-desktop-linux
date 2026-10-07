import http from 'node:http';
import https from 'node:https';
import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { recordHttpTelemetry } from './record-telemetry';
import { isTelemetryEnabled } from './telemetry-config';

type SetupHttpTelemetryProps = {
  onRecord?: typeof recordHttpTelemetry;
};

type CreateHttpTelemetryInterceptorsProps = {
  onRecord?: typeof recordHttpTelemetry;
};

type AttachHttpTelemetryProps = {
  http: AxiosInstance;
  onRecord?: typeof recordHttpTelemetry;
};

let isHttpTelemetryInitialized = false;
let activeRecordHandler = recordHttpTelemetry;

function extractRequestDetails(args: unknown[], isHttps: boolean) {
  let method = 'GET';
  let url = '';
  let socketPath: string | undefined;

  const firstArg = args[0];
  const secondArg = args[1];

  if (typeof firstArg === 'string') {
    url = firstArg;
    if (secondArg && typeof secondArg === 'object' && secondArg !== null) {
      const opts = secondArg as Record<string, unknown>;
      if (typeof opts.method === 'string') method = opts.method.toUpperCase();
      if (typeof opts.socketPath === 'string') socketPath = opts.socketPath;
    }
  } else if (firstArg instanceof URL) {
    url = firstArg.href;
    if (secondArg && typeof secondArg === 'object' && secondArg !== null) {
      const opts = secondArg as Record<string, unknown>;
      if (typeof opts.method === 'string') method = opts.method.toUpperCase();
      if (typeof opts.socketPath === 'string') socketPath = opts.socketPath;
    }
  } else if (firstArg && typeof firstArg === 'object') {
    const opts = firstArg as Record<string, unknown>;
    if (typeof opts.method === 'string') method = opts.method.toUpperCase();
    if (typeof opts.socketPath === 'string') socketPath = opts.socketPath;

    const protocol = typeof opts.protocol === 'string' ? opts.protocol : isHttps ? 'https:' : 'http:';
    const host =
      typeof opts.hostname === 'string' ? opts.hostname : typeof opts.host === 'string' ? opts.host : 'localhost';
    const defaultPort = isHttps ? 443 : 80;
    const port = opts.port && Number(opts.port) !== defaultPort ? `:${opts.port}` : '';
    const path = typeof opts.path === 'string' ? opts.path : '/';
    url = `${protocol}//${host}${port}${path}`;
  }

  return { method, url, socketPath };
}

export function setupHttpTelemetry(props?: SetupHttpTelemetryProps) {
  if (props?.onRecord) {
    activeRecordHandler = props.onRecord;
  }

  if (isHttpTelemetryInitialized || !isTelemetryEnabled()) {
    return;
  }
  isHttpTelemetryInitialized = true;

  const modules: Array<[typeof http | typeof https, boolean]> = [
    [http, false],
    [https, true],
  ];

  modules.forEach(([mod, isHttps]) => {
    const originalRequest = mod.request;

    mod.request = function (this: unknown, ...args: Parameters<typeof originalRequest>) {
      const { method, url, socketPath } = extractRequestDetails(args, isHttps);

      if (socketPath) {
        return originalRequest.apply(this, args);
      }

      const startTime = performance.now();
      const clientRequest = originalRequest.apply(this, args);

      clientRequest.once('response', (response: http.IncomingMessage) => {
        activeRecordHandler({
          method,
          url,
          durationMs: performance.now() - startTime,
          status: response.statusCode ?? 0,
        });
      });

      clientRequest.once('error', (error: Error) => {
        activeRecordHandler({
          method,
          url,
          durationMs: performance.now() - startTime,
          status: 0,
          error: error.message,
        });
      });

      return clientRequest;
    } as typeof originalRequest;

    const originalGet = mod.get;
    mod.get = function (this: unknown, ...args: Parameters<typeof originalGet>) {
      const req = mod.request.apply(this, args as Parameters<typeof mod.request>);
      req.end();
      return req;
    } as typeof originalGet;
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require('electron');
    const net = electron.net;
    if (net && typeof net.request === 'function') {
      const originalNetRequest = net.request.bind(net);
      net.request = function (options: unknown) {
        let method = 'GET';
        let url = '';

        if (typeof options === 'string') {
          url = options;
        } else if (options && typeof options === 'object') {
          const opts = options as Record<string, unknown>;
          if (typeof opts.method === 'string') method = opts.method.toUpperCase();
          if (typeof opts.url === 'string') url = opts.url;
        }

        const startTime = performance.now();
        const clientRequest = originalNetRequest(options);

        clientRequest.on('response', (response: { statusCode?: number }) => {
          activeRecordHandler({
            method,
            url,
            durationMs: performance.now() - startTime,
            status: response.statusCode ?? 0,
          });
        });

        clientRequest.on('error', (err: Error) => {
          activeRecordHandler({
            method,
            url,
            durationMs: performance.now() - startTime,
            status: 0,
            error: err.message,
          });
        });

        return clientRequest;
      };
    }
  } catch {
    // Ignore in non-electron environments
  }

  if (typeof globalThis.fetch === 'function') {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const startTime = performance.now();
      const method = init?.method?.toUpperCase() ?? 'GET';
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      try {
        const response = await originalFetch.call(this, input, init);
        activeRecordHandler({
          method,
          url,
          durationMs: performance.now() - startTime,
          status: response.status,
        });
        return response;
      } catch (error) {
        activeRecordHandler({
          method,
          url,
          durationMs: performance.now() - startTime,
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };
  }
}

export function createHttpTelemetryInterceptors(props?: CreateHttpTelemetryInterceptorsProps) {
  const onRecord = props?.onRecord ?? recordHttpTelemetry;
  const requestStartTimes = new WeakMap<object, number>();

  function onRequestFulfilled(config: InternalAxiosRequestConfig) {
    requestStartTimes.set(config, performance.now());
    return config;
  }

  function onResponseFulfilled(response: AxiosResponse) {
    const startTime = response.config ? requestStartTimes.get(response.config) : undefined;
    const durationMs = startTime !== undefined ? performance.now() - startTime : 0;

    onRecord({
      method: response.config?.method?.toUpperCase() ?? 'GET',
      url: response.config?.url ?? '',
      durationMs,
      status: response.status,
    });

    return response;
  }

  function onResponseRejected(error: AxiosError) {
    const config = error.config;
    const startTime = config ? requestStartTimes.get(config) : undefined;
    const durationMs = startTime !== undefined ? performance.now() - startTime : 0;

    onRecord({
      method: config?.method?.toUpperCase() ?? 'GET',
      url: config?.url ?? '',
      durationMs,
      status: error.response?.status ?? 0,
      error: error.message,
    });

    return Promise.reject(error);
  }

  return { onRequestFulfilled, onResponseFulfilled, onResponseRejected };
}

export function attachHttpTelemetryInterceptor({ http, onRecord }: AttachHttpTelemetryProps) {
  if (!isTelemetryEnabled()) {
    return;
  }

  const { onRequestFulfilled, onResponseFulfilled, onResponseRejected } = createHttpTelemetryInterceptors({ onRecord });
  http.interceptors.request.use(onRequestFulfilled);
  http.interceptors.response.use(onResponseFulfilled, onResponseRejected);
}
