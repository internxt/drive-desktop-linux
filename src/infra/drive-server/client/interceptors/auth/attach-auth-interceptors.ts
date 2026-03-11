import type { AxiosInstance } from 'axios';
import { createRequestInterceptor } from './create-request-interceptor';
import { createResponseInterceptor } from './create-response-interceptor';
import { ClientOptions } from '../../../drive-server.types';

type AuthInterceptorOptions = Omit<ClientOptions, 'baseUrl'>;

export function attachAuthInterceptors(instance: AxiosInstance, options: AuthInterceptorOptions): void {
  if (options.authHeadersProvider) {
    instance.interceptors.request.use(createRequestInterceptor(options.authHeadersProvider));
  }

  if (options.onUnauthorized) {
    const { onFulfilled, onRejected } = createResponseInterceptor(options.onUnauthorized);
    instance.interceptors.response.use(onFulfilled, onRejected);
  }
}
