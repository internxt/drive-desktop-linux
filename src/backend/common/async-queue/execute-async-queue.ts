import { queue } from 'async';
import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../context/shared/domain/Result';
import { AsyncQueueConfig, TaskExecutor } from './types';

export async function executeAsyncQueue<T>(
  items: T[],
  executor: TaskExecutor<T>,
  config: AsyncQueueConfig,
): Promise<Result<void, DriveDesktopError>> {
  return new Promise((resolve) => {
    const taskQueue = queue(async (item: T) => {
      if (config.signal.aborted) return;

      const result = await executor(item, config.signal);

      if (result.error) {
        taskQueue.kill();
        resolve({ error: result.error });
      }
    }, config.concurrency);

    taskQueue.drain(() => resolve({ data: undefined }));

    taskQueue.push(items);
  });
}
