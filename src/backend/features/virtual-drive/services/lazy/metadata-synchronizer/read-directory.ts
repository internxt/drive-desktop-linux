import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { FileStatuses } from '../../../../../../context/virtual-drive/files/domain/FileStatus';
import { FolderStatuses } from '../../../../../../context/virtual-drive/folders/domain/FolderStatus';
import { DirectoryMetadataSyncError } from '../directory-metadata-sync.error';
import { DirectoryStateRepository } from '../directory-state-sqlite-repository';
import { resolveFolder } from './resolve-folder';
import { synchronizeChildrenIfStale } from './synchronize-children-if-stale';
import { PathMetadataProps } from './types';

export async function readDirectory({ path, folderRepository, fileRepository }: PathMetadataProps) {
  const folderResult = await resolveFolder({ path, folderRepository, fileRepository });
  if (folderResult.error) return folderResult;

  const folder = folderResult.data;
  const refresh = await synchronizeChildrenIfStale({ folder, folderRepository, fileRepository });
  if (refresh.error && !(await canServeCachedChildren({ folderId: folder.id, error: refresh.error }))) {
    return refresh;
  }

  return Result.ok({
    folders: folderRepository
      .matchingPartial({ parentId: folder.id, status: FolderStatuses.EXISTS })
      .map((child) => child.name),
    files: fileRepository
      .matchingPartial({ folderId: folder.id, status: FileStatuses.EXISTS })
      .map((child) => child.nameWithExtension),
  });
}

async function canServeCachedChildren({ folderId, error }: { folderId: number; error: Error }) {
  if (!(error instanceof DirectoryMetadataSyncError) || !error.canUseCachedChildren) return false;
  const state = await DirectoryStateRepository.getState({ folderId, statusScope: 'EXISTS' });
  return Boolean(state?.children_loaded_at);
}
