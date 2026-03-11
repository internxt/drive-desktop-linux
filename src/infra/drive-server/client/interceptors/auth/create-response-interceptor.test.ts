import { AxiosError } from 'axios';
import { createResponseInterceptor } from './create-response-interceptor';

vi.unmock('axios');

describe('createResponseInterceptor', () => {
  it('should return response unchanged on fulfilled', () => {
    const { onFulfilled } = createResponseInterceptor(vi.fn());
    const response = {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    } as any;

    const result = onFulfilled(response);

    expect(result).toBe(response);
  });

  it('should call onUnauthorized when error status is 401', async () => {
    const onUnauthorized = vi.fn();
    const { onRejected } = createResponseInterceptor(onUnauthorized);

    const error = new AxiosError('Unauthorized', '401');
    error.response = {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      data: {},
      config: {} as any,
    };

    await expect(onRejected(error)).rejects.toBe(error);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('should not call onUnauthorized for non-401 errors', async () => {
    const onUnauthorized = vi.fn();
    const { onRejected } = createResponseInterceptor(onUnauthorized);

    const error = new AxiosError('Server Error', '500');
    error.response = {
      status: 500,
      statusText: 'Server Error',
      headers: {},
      data: {},
      config: {} as any,
    };

    await expect(onRejected(error)).rejects.toBe(error);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
