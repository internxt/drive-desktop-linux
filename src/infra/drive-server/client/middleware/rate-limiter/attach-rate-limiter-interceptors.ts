import type { AxiosInstance } from 'axios';
import { DelayState, RateLimitState } from './rate-limiter.types';
import { createRequestInterceptor } from './create-request-interceptor';
import { createResponseInterceptor } from './create-response-interceptor';

/**
 * Attaches rate limiting interceptors to an Axios instance.
 *
 * - Tracks rate limit headers from API responses
 * - Handles 429 responses by waiting and retrying (up to MAX_RETRIES)
 */
export function attachRateLimiterInterceptors(instance: AxiosInstance): void {
  const state: RateLimitState = { limit: null, remaining: null, reset: null };
  const delayState: DelayState = { pending: null };

  instance.interceptors.request.use(createRequestInterceptor(delayState));

  const { onFulfilled, onRejected } = createResponseInterceptor(instance, state, delayState);
  instance.interceptors.response.use(onFulfilled, onRejected);
}
