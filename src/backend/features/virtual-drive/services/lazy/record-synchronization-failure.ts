import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { DriveServerError } from '../../../../../infra/drive-server/drive-server.error';
import { DirectoryMetadataSyncError } from './directory-metadata-sync.error';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';

type Props = {
  folder: Folder;
  error: unknown;
  localMutationStarted: boolean;
};

export async function recordSynchronizationFailure({ folder, error, localMutationStarted }: Props) {
  logger.error({ msg: '[FUSE - Metadata sync] Failed to synchronize directory metadata', error, path: folder.path });
  const code = error instanceof DriveServerError && error.cause === 'NOT_FOUND' ? FuseCodes.ENOENT : FuseCodes.EIO;
  const canUseCachedChildren = !localMutationStarted && code !== FuseCodes.ENOENT;

  const failureState =
    code === FuseCodes.ENOENT ? 'error_not_found' : canUseCachedChildren ? 'error_before_mutation' : 'error';
  await DirectoryStateRepository.markError({
    folderUuid: folder.uuid,
    statusScope: 'EXISTS',
    failureState,
  });
  return Result.err(new DirectoryMetadataSyncError({ code, folderPath: folder.path, canUseCachedChildren }));
}
