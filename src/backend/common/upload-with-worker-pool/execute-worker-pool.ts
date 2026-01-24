import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../context/shared/domain/Result';
import { getNextTask } from './get-next-task';
import { runWorker } from './run-worker';
import { QueueIndex, TaskExecutor, WorkerPoolConfig, WorkerPoolResult, WorkerState } from './types';

export async function executeWorkerPool<T>(
  items: T[],
  executor: TaskExecutor<T>,
  config: WorkerPoolConfig,
): Promise<Result<WorkerPoolResult<T>, DriveDesktopError>> {
  const queue = [...items];
  const index: QueueIndex = { value: 0 };
  const state: WorkerState<T> = {
    results: { succeeded: [], failed: [] },
    fatalError: null,
  };

  const getNext = () => getNextTask(queue, index);

  const workers = Array.from({ length: config.concurrency }, () =>
    runWorker(getNext, executor, state, config.signal),
  );

  await Promise.all(workers);

  if (state.fatalError) {
    return { error: state.fatalError };
  }

  return { data: state.results };
}
