import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { executeAsyncQueue } from './execute-async-queue';
import { TaskExecutor } from './types';

describe('executeAsyncQueue', () => {
  let abortController: AbortController;

  beforeEach(() => {
    abortController = new AbortController();
  });

  it('should process all items successfully', async () => {
    const processed: number[] = [];
    const executor: TaskExecutor<number> = async (item) => {
      processed.push(item);
      return { data: undefined };
    };

    const result = await executeAsyncQueue([1, 2, 3], executor, {
      concurrency: 10,
      signal: abortController.signal,
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(processed).toHaveLength(3);
  });

  it('should stop processing when executor returns an error', async () => {
    const processed: number[] = [];
    const fatalError = new DriveDesktopError('NOT_ENOUGH_SPACE', 'No space');
    const executor: TaskExecutor<number> = async (item) => {
      processed.push(item);
      if (item === 2) {
        return { error: fatalError };
      }
      return { data: undefined };
    };

    const result = await executeAsyncQueue([1, 2, 3, 4, 5], executor, {
      concurrency: 1,
      signal: abortController.signal,
    });

    expect(result.error).toBe(fatalError);
    expect(processed).toStrictEqual([1, 2]);
  });

  it('should respect concurrency limit', async () => {
    let maxConcurrent = 0;
    let running = 0;

    const executor: TaskExecutor<number> = async () => {
      running++;
      if (running > maxConcurrent) maxConcurrent = running;
      await new Promise((resolve) => setTimeout(resolve, 10));
      running--;
      return { data: undefined };
    };

    await executeAsyncQueue([1, 2, 3, 4, 5, 6], executor, {
      concurrency: 3,
      signal: abortController.signal,
    });

    expect(maxConcurrent).toBe(3);
  });

  it('should skip items when signal is aborted', async () => {
    const processed: number[] = [];
    const executor: TaskExecutor<number> = async (item) => {
      processed.push(item);
      if (item === 2) {
        abortController.abort();
      }
      return { data: undefined };
    };

    const result = await executeAsyncQueue([1, 2, 3, 4, 5], executor, {
      concurrency: 1,
      signal: abortController.signal,
    });

    expect(result.data).toBeUndefined();
    expect(processed).toStrictEqual([1, 2]);
  });

  it('should pass the signal to the executor', async () => {
    let receivedSignal: AbortSignal | undefined;
    const executor: TaskExecutor<number> = async (_item, signal) => {
      receivedSignal = signal;
      return { data: undefined };
    };

    await executeAsyncQueue([1], executor, {
      concurrency: 1,
      signal: abortController.signal,
    });

    expect(receivedSignal).toBe(abortController.signal);
  });
});
