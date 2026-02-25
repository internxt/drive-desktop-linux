import type { AxiosInstance } from 'axios';
import { AuthInterceptorOptions } from './auth.types';
import { createRequestInterceptor } from './create-request-interceptor';
import { createResponseInterceptor } from './create-response-interceptor';

export function attachAuthInterceptors(instance: AxiosInstance, options: AuthInterceptorOptions): void {
  if (options.authHeadersProvider) {
    instance.interceptors.request.use(createRequestInterceptor(options.authHeadersProvider));
  }

  if (options.onUnauthorized) {
    const { onFulfilled, onRejected } = createResponseInterceptor(options.onUnauthorized);
    instance.interceptors.response.use(onFulfilled, onRejected);
  }
}
