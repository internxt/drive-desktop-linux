import { createTransientErrorHandler } from '../../../../../backend/common/rate-limit/transient-error-handler';
import { retryWithBackoff } from '../../../../../shared/retry-with-backoff';
import { Result } from '../../../../shared/domain/Result';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { FolderPath } from '../../domain/FolderPath';
import { FolderPersistedDto, RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';

type Props = {
  remoteFileSystem: RemoteFileSystem;
  folderPath: FolderPath;
  parentUuid: string;
  tag: 'BACKUPS' | 'SYNC-ENGINE';
  context: string;
  signal?: AbortSignal;
};

export function persistFolderWithRetry({
  remoteFileSystem,
  folderPath,
  parentUuid,
  tag,
  context,
  signal,
}: Props): Promise<Result<FolderPersistedDto, DriveDesktopError>> {
  return retryWithBackoff(
    async () => {
      const result = await remoteFileSystem.persist(folderPath.name(), parentUuid);
      if (result.isLeft()) {
        return { error: result.getLeft() };
      }

      return { data: result.getRight() };
    },
    createTransientErrorHandler({ tag, context, path: folderPath.value }),
    signal ?? new AbortController().signal,
  );
}
