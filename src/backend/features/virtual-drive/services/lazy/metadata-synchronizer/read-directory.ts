import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { FileStatuses } from '../../../../../../context/virtual-drive/files/domain/FileStatus';
import { FolderStatuses } from '../../../../../../context/virtual-drive/folders/domain/FolderStatus';
import { DirectoryMetadataSyncError } from '../directory-metadata-sync.error';
import { DirectoryStateRepository } from '../directory-state-sqlite-repository';
import { isVirtualTrashFolder } from '../../drive-folder/is-virtual-trash';
import { resolveFolder } from './resolve-folder';
import { synchronizeChildrenIfStale } from './synchronize-children-if-stale';
import { PathMetadataProps } from './types';

export async function readDirectory({ path, folderRepository, fileRepository }: PathMetadataProps) {
  const folderResult = await resolveFolder({ path, folderRepository, fileRepository });
  if (folderResult.error) return folderResult;

  const folder = folderResult.data;
  const refresh = await synchronizeChildrenIfStale({ folder, folderRepository, fileRepository });
  if (refresh.error && !(await canServeCachedChildren({ folderUuid: folder.uuid, error: refresh.error }))) {
    return refresh;
  }

  return Result.ok({
    folders: folderRepository
      .matchingPartial({ parentUuid: folder.uuid, status: FolderStatuses.EXISTS })
      .filter((child) => !isVirtualTrashFolder(child))
      .map((child) => child.name),
    files: fileRepository
      .matchingPartial({ folderUuid: folder.uuid, status: FileStatuses.EXISTS })
      .map((child) => child.nameWithExtension),
  });
}

async function canServeCachedChildren({ folderUuid, error }: { folderUuid: string; error: Error }) {
  if (!(error instanceof DirectoryMetadataSyncError) || !error.canUseCachedChildren) return false;
  const state = await DirectoryStateRepository.getState({ folderUuid, statusScope: 'EXISTS' });
  return Boolean(state?.children_loaded_at);
}
