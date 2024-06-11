import { SyncErrorCause } from '../../../../shared/issues/SyncErrorCause';

export class DriveDesktopError extends Error {
  constructor(public readonly cause: SyncErrorCause, message?: string) {
    super(message);
  }
}
