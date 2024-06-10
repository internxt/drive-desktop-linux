import { SyncErrorCause } from '../../../../shared/issues/SyncErrorCause';
import { LocalFile } from './LocalFile';

export abstract class LocalFileMessenger {
  abstract creationFailed(
    file: LocalFile,
    issue: SyncErrorCause
  ): Promise<void>;
}
