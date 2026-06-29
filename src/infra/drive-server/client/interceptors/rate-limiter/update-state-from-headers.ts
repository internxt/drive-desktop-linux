import { AxiosResponse } from 'axios';
import { RateLimitState } from './rate-limiter.types';

const MAX_REASONABLE_RESET_SECONDS = 120;

function parseNumberHeader(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeResetToMs(resetValue: number) {
  if (resetValue <= MAX_REASONABLE_RESET_SECONDS) {
    return resetValue * 1000;
  }

  return resetValue;
}

export function updateStateFromHeaders(state: RateLimitState, headers: AxiosResponse['headers']): void {
  const limitHeader = headers['x-internxt-ratelimit-limit'];
  const remainingHeader = headers['x-internxt-ratelimit-remaining'];
  const resetHeader = headers['x-internxt-ratelimit-reset'];

  const limit = parseNumberHeader(limitHeader);
  const remaining = parseNumberHeader(remainingHeader);
  const reset = parseNumberHeader(resetHeader);

  if (limit !== null) {
    state.limit = limit;
  }
  if (remaining !== null) {
    state.remaining = remaining;
  }
  if (reset !== null) {
    state.reset = normalizeResetToMs(reset);
  }
}
