import { delay } from '../../../../../shared/async/delay';
import { DelayState } from './rate-limiter.types';

export async function waitForDelay(delayState: DelayState, key: string, ms: number): Promise<void> {
  const currentPending = delayState.pendingByKey[key];
  if (currentPending) {
    await currentPending;
    return;
  }

  const pending = delay(ms);
  delayState.pendingByKey[key] = pending;
  await pending;
  delete delayState.pendingByKey[key];
}
