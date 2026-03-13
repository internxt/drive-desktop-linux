import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { AxiosError, AxiosResponse } from 'axios';

export function createResponseInterceptor(): {
  onFulfilled: (response: AxiosResponse) => AxiosResponse;
  onRejected: (error: AxiosError) => Promise<never>;
} {
  const onFulfilled = (response: AxiosResponse): AxiosResponse => {
    logger.debug({
      msg: '[DRIVE SERVER] HTTP request succeeded',
      method: response.config?.method?.toUpperCase(),
      url: response.config?.url,
      status: response.status,
    });
    return response;
  };

  const onRejected = (error: AxiosError): Promise<never> => {
    const status = error.response?.status;

    if (status !== undefined && status >= 400) {
      const requestId = error.response?.headers?.['x-request-id'] ?? 'unknown';

      logger.error({
        msg: '[DRIVE SERVER] HTTP error response',
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status,
        requestId,
        message: error.response?.data
          ? ((error.response.data as { message?: string }).message ?? error.message)
          : error.message,
      });
    }

    return Promise.reject(error);
  };

  return { onFulfilled, onRejected };
}
