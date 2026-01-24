import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../context/shared/domain/Result';

export type WorkerPoolConfig = {
  concurrency: number;
  signal: AbortSignal;
};

export type WorkerPoolResult<T> = {
  succeeded: Array<T>;
  failed: Array<{ item: T; error: DriveDesktopError }>;
};

export type TaskExecutor<T> = (item: T, signal: AbortSignal) => Promise<Result<void, DriveDesktopError>>;

export type QueueIndex = { value: number };

export type WorkerState<T> = {
  results: WorkerPoolResult<T>;
  fatalError: DriveDesktopError | null;
};
