/* eslint-disable no-constant-condition */
import { isFatalError } from '../../../shared/issues/SyncErrorCause';
import { TaskExecutor, WorkerState } from './types';

export async function runWorker<T>(
  getNext: () => T | null,
  executor: TaskExecutor<T>,
  state: WorkerState<T>,
  signal: AbortSignal,
): Promise<void> {
  while (true) {
    if (signal.aborted || state.fatalError) break;

    const item = getNext();
    if (!item) break;

    // eslint-disable-next-line no-await-in-loop
    const result = await executor(item, signal);

    if (result.error) {
      state.results.failed.push({ item, error: result.error });

      if (isFatalError(result.error.cause)) {
        state.fatalError = result.error;
        break;
      }
    } else {
      state.results.succeeded.push(item);
    }
  }
}
