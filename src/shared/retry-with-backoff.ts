/* eslint-disable no-await-in-loop */
import { Result } from '../context/shared/domain/Result';
import { DriveDesktopError } from '../context/shared/domain/errors/DriveDesktopError';

function sleepAbortable(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

export async function retryWithBackoff<T>(
  fn: () => Promise<Result<T, DriveDesktopError>>,
  onError: (error: DriveDesktopError) => number | null,
  signal: AbortSignal,
): Promise<Result<T, DriveDesktopError>> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal.aborted) {
      return { error: new DriveDesktopError('ABORTED') };
    }

    const result = await fn();

    if (!result.error) {
      return result;
    }

    const delayMs = onError(result.error);

    if (delayMs === null) {
      return { error: result.error };
    }

    await sleepAbortable(delayMs, signal);
  }
}
