import type { InternalAxiosRequestConfig } from 'axios';
import { createRequestInterceptor } from './create-request-interceptor';

describe('createRequestInterceptor', () => {
  it('should add headers provided by authHeadersProvider', async () => {
    const interceptor = createRequestInterceptor(() => ({
      Authorization: 'Bearer token',
      'x-client-id': 'desktop',
    }));

    const config = { headers: {} } as InternalAxiosRequestConfig;
    const result = await interceptor(config);

    expect(result.headers).toMatchObject({
      Authorization: 'Bearer token',
      'x-client-id': 'desktop',
    });
  });

  it('should not overwrite a header already present in the request', async () => {
    const interceptor = createRequestInterceptor(() => ({ Authorization: 'Bearer from-provider' }));

    const config = {
      headers: { Authorization: 'Bearer existing' },
    } as InternalAxiosRequestConfig;

    const result = await interceptor(config);

    expect((result.headers as Record<string, string>).Authorization).toBe('Bearer existing');
  });

  it('should resolve async authHeadersProvider', async () => {
    const interceptor = createRequestInterceptor(async () => ({ Authorization: 'Bearer async-token' }));

    const config = { headers: {} } as InternalAxiosRequestConfig;
    const result = await interceptor(config);

    expect((result.headers as Record<string, string>).Authorization).toBe('Bearer async-token');
  });
});
