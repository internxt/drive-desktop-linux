import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../context/shared/domain/Result';

export type TaskExecutor<T> = (item: T, signal: AbortSignal) => Promise<Result<void, DriveDesktopError>>;
export type AsyncQueueConfig = {
  concurrency: number;
  signal: AbortSignal;
};
