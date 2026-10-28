export const RETRY_CONFIG_KEY = '__rateLimiterRetryCount';

/**
 * How many times a 429 is retried. The first request is not counted.
 *
 * Three gave up while a large save was still inside the server's wait window.
 * Five is a small step up: enough to ride out a burst, without holding one
 * request open across a long reset.
 */
export const MAX_RETRIES = 5;
