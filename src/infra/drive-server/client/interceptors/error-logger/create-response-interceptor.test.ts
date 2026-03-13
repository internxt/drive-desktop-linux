import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { createResponseInterceptor } from './create-response-interceptor';
import { loggerMock } from '../../../../../../tests/vitest/mocks.helper';
import { call } from 'tests/vitest/utils.helper';

vi.unmock('axios');

function makeResponse(headers: Record<string, string> = {}): AxiosResponse {
  return {
    data: {},
    status: 200,
    statusText: 'OK',
    headers,
    config: {} as InternalAxiosRequestConfig,
  };
}

function makeConfig(overrides: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig {
  return {
    method: 'get',
    url: '/files/123',
    ...overrides,
  } as InternalAxiosRequestConfig;
}

function makeErrorWithStatus(
  status: number,
  config?: InternalAxiosRequestConfig,
  responseHeaders: Record<string, string> = {},
  responseData: unknown = {},
): AxiosError {
  const cfg = config ?? makeConfig();
  const error = new AxiosError('Request failed', String(status), cfg);
  error.response = {
    status,
    statusText: 'Error',
    headers: responseHeaders,
    data: responseData,
    config: cfg,
  };
  return error;
}

describe('error-logger createResponseInterceptor', () => {

  describe('onFulfilled', () => {
    it('should return the response unchanged', () => {
      const { onFulfilled } = createResponseInterceptor();
      const response = makeResponse();

      const result = onFulfilled(response);

      expect(result).toBe(response);
    });

    it('should log successful requests', () => {
      const { onFulfilled } = createResponseInterceptor();
      const response: AxiosResponse = {
        data: { id: 1 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { method: 'get', url: '/files/123' } as InternalAxiosRequestConfig,
      };

      onFulfilled(response);

      call(loggerMock.debug).toMatchObject({
        msg: '[DRIVE SERVER] HTTP request succeeded',
        method: 'GET',
        url: '/files/123',
        status: 200,
      });
    });
  });

  describe('onRejected', () => {
    it('should log when status is >= 400', async () => {
      const { onRejected } = createResponseInterceptor();
      const error = makeErrorWithStatus(500, makeConfig({ method: 'post', url: '/users' }), {
        'x-request-id': 'req-abc-123',
      });

      await expect(onRejected(error)).rejects.toBe(error);

      call(loggerMock.error).toMatchObject({
        msg: '[DRIVE SERVER] HTTP error response',
        method: 'POST',
        url: '/users',
        status: 500,
        requestId: 'req-abc-123',
        message: 'Request failed',
      });
    });

    it('should log "unknown" when x-request-id header is missing', async () => {
      const { onRejected } = createResponseInterceptor();
      const error = makeErrorWithStatus(404, makeConfig({ method: 'get', url: '/files/999' }));

      await expect(onRejected(error)).rejects.toBe(error);

      call(loggerMock.error).toMatchObject({
        status: 404,
        requestId: 'unknown',
      });
    });

    it('should use response data message when available', async () => {
      const { onRejected } = createResponseInterceptor();
      const error = makeErrorWithStatus(
        400,
        makeConfig({ method: 'post', url: '/upload' }),
        { 'x-request-id': 'req-def-456' },
        { message: 'Invalid file format' },
      );

      await expect(onRejected(error)).rejects.toBe(error);

      call(loggerMock.error).toMatchObject({
        message: 'Invalid file format',
      });
    });

    it('should not log when status is below 400', async () => {
      const { onRejected } = createResponseInterceptor();
      const error = new AxiosError('Redirect', '301', makeConfig());
      error.response = {
        status: 301,
        statusText: 'Moved',
        headers: {},
        data: {},
        config: makeConfig(),
      };

      await expect(onRejected(error)).rejects.toBe(error);

      expect(loggerMock.error).not.toBeCalled();
    });

    it('should not log when there is no response (network error)', async () => {
      const { onRejected } = createResponseInterceptor();
      const error = new AxiosError('Network Error', 'ERR_NETWORK', makeConfig());

      await expect(onRejected(error)).rejects.toBe(error);

      expect(loggerMock.error).not.toBeCalled();
    });

    it('should always re-throw the original error', async () => {
      const { onRejected } = createResponseInterceptor();
      const error = makeErrorWithStatus(503);

      await expect(onRejected(error)).rejects.toBe(error);
    });

    it('should log for all 4xx statuses', async () => {
      const { onRejected } = createResponseInterceptor();

      for (const status of [400, 401, 403, 404, 409, 429]) {
        const error = makeErrorWithStatus(status, makeConfig(), { 'x-request-id': `req-${status}` });

        await expect(onRejected(error)).rejects.toBe(error);

        expect(loggerMock.error).toBeCalledWith(
          expect.objectContaining({
            status,
            requestId: `req-${status}`,
          })
        );
      }
    });
  });
});
