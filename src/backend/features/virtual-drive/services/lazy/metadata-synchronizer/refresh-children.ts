import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { DIRECTORY_STATE_ERROR_COOLDOWN_MS } from '../constants';
import { DirectoryMetadataSyncError } from '../directory-metadata-sync.error';
import { DirectoryStateRepository } from '../directory-state-sqlite-repository';
import { synchronizeDirectoryMetadata } from '../synchronize-directory-metadata';
import { FolderMetadataProps } from './types';

export async function refreshChildren({ folder, folderRepository, fileRepository }: FolderMetadataProps) {
  const statusScope = 'EXISTS' as const;
  const state = await DirectoryStateRepository.getState({ folderUuid: folder.uuid, statusScope });
  const isInErrorCooldown =
    state?.children_last_error_at &&
    Date.now() - new Date(state.children_last_error_at).getTime() < DIRECTORY_STATE_ERROR_COOLDOWN_MS;

  if (isInErrorCooldown) {
    return Result.err(
      new DirectoryMetadataSyncError({
        code: state.fetch_state === 'error_not_found' ? FuseCodes.ENOENT : FuseCodes.EIO,
        folderPath: folder.path,
        canUseCachedChildren: state.fetch_state === 'error_before_mutation',
      }),
    );
  }
  if (await DirectoryStateRepository.isFresh({ folderUuid: folder.uuid, statusScope })) return Result.ok(undefined);
  return synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });
}
