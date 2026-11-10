import { AxiosError, AxiosHeaders, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  CLIENT_VERSION_UNSUPPORTED_ERROR_CODE,
  isUnsupportedVersionError,
  logger,
} from '@internxt/drive-desktop-core/build/backend';
import { isClientUnsupported, setClientCompatibility } from './client-compatibility-state';

const UNSUPPORTED_RESPONSE_BODY = {
  message: 'This version of the app is no longer supported. Please update to a newer version.',
  error: 'Forbidden',
  statusCode: 403,
  errorCode: CLIENT_VERSION_UNSUPPORTED_ERROR_CODE,
};

/**
 * v2.7.1 Alexis Mora
 * Once the backend rejects this version every request would fail the same way, so we fail locally with the
 * same response instead of hitting the network. This keeps syncs and retries from looping against the backend.
 */
export function rejectRequestIfClientUnsupported(config: InternalAxiosRequestConfig) {
  if (!isClientUnsupported()) return config;

  throw new AxiosError(UNSUPPORTED_RESPONSE_BODY.message, AxiosError.ERR_BAD_REQUEST, config, undefined, {
    data: UNSUPPORTED_RESPONSE_BODY,
    status: UNSUPPORTED_RESPONSE_BODY.statusCode,
    statusText: UNSUPPORTED_RESPONSE_BODY.error,
    headers: new AxiosHeaders(),
    config,
  });
}

/**
 * v2.7.1 Alexis Mora
 * The backend asks clients to rely only on `errorCode`: the HTTP status (403 today),
 * `error` and `message` can change or overlap with other responses.
 */
export function detectUnsupportedClientVersion(error: unknown) {
  if (
    !isClientUnsupported() &&
    error instanceof AxiosError &&
    isUnsupportedVersionError({ body: error.response?.data })
  ) {
    logger.warn({ msg: 'Backend rejected this client version', url: error.config?.url });
    setClientCompatibility({ state: { status: 'unsupported' } });
  }

  return Promise.reject(error);
}

export function attachClientVersionInterceptors(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => rejectRequestIfClientUnsupported(config));
  instance.interceptors.response.use(undefined, (error) => detectUnsupportedClientVersion(error));
}
