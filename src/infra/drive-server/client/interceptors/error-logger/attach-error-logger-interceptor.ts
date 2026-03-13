import type { AxiosInstance } from 'axios';
import { createResponseInterceptor } from './create-response-interceptor';

export function attachErrorLoggerInterceptor(instance: AxiosInstance): void {
  const { onFulfilled, onRejected } = createResponseInterceptor();
  instance.interceptors.response.use(onFulfilled, onRejected);
}
