import { delay } from './delay';
import { DelayState } from './rate-limiter.types';

/**
 * Coordinates delay across concurrent requests.
 * If a delay is already in progress, concurrent requests wait on the same promise
 * instead of creating separate delays.
 */
export async function waitForDelay(delayState: DelayState, ms: number): Promise<void> {
  if (delayState.pending) {
    await delayState.pending;
    return;
  }

  delayState.pending = delay(ms);
  await delayState.pending;
  delayState.pending = null;
}
