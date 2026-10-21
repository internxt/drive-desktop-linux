import { posix } from 'node:path';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { isVirtualTrashPath } from '../../drive-folder/seed-virtual-drive-root-folders';
import { normalizePath } from '../../normalize-path';
import { synchronizeChildrenIfStale } from './synchronize-children-if-stale';
import { PathMetadataProps } from './types';

export async function resolveFolder({ path, folderRepository, fileRepository }: PathMetadataProps) {
  const rootFolder = folderRepository.matchingPartial({ path: '/' })[0];

  if (!rootFolder) {
    return Result.err(new FuseError(FuseCodes.EIO, '[FUSE - Metadata sync] Root folder not initialized'));
  }

  let currentFolder = rootFolder;
  let currentPath = '';

  for (const segment of normalizePath(path).split('/').filter(Boolean)) {
    currentPath = posix.join(currentPath, segment);
    const absolutePath = `/${currentPath}`;
    const existingFolder = folderRepository.matchingPartial({ path: absolutePath })[0];

    if (existingFolder) {
      currentFolder = existingFolder;
      continue;
    }

    if (isVirtualTrashPath(absolutePath)) {
      return Result.err(new FuseError(FuseCodes.ENOENT, `[FUSE - Metadata sync] Folder not found: ${absolutePath}`));
    }

    const refresh = await synchronizeChildrenIfStale({ folder: currentFolder, folderRepository, fileRepository });
    if (refresh.error) return refresh;

    const synchronizedFolder = folderRepository.matchingPartial({ path: absolutePath })[0];

    if (!synchronizedFolder) {
      return Result.err(new FuseError(FuseCodes.ENOENT, `[FUSE - Metadata sync] Folder not found: ${absolutePath}`));
    }

    currentFolder = synchronizedFolder;
  }

  return Result.ok(currentFolder);
}
