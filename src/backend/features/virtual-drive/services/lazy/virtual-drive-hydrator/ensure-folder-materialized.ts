import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../../apps/drive/fuse/callbacks/FuseErrors';
import type { HydratorStatusScope } from './types';
import { isRootPath } from './path';
import { resolveRootFolder } from './resolve-root-folder';

export async function ensureFolderMaterialized({
  requestedPath,
  statusScope,
  folderRepository,
  refreshChildrenIfNeeded,
}: {
  requestedPath: string;
  statusScope: HydratorStatusScope;
  folderRepository: FolderRepository;
  refreshChildrenIfNeeded: (props: { folder: Folder; statusScope: HydratorStatusScope }) => Promise<void>;
}) {
  const root = await resolveRootFolder({ folderRepository });

  if (isRootPath(requestedPath)) {
    return root;
  }

  let currentFolder = root;
  let currentPath = '';

  for (const segment of requestedPath.split('/').filter(Boolean)) {
    currentPath = `${currentPath}/${segment}`;

    const existing = folderRepository.matchingPartial({ path: currentPath })[0];
    if (existing) {
      currentFolder = existing;
      continue;
    }

    await refreshChildrenIfNeeded({ folder: currentFolder, statusScope });

    const hydrated = folderRepository.matchingPartial({ path: currentPath })[0];
    if (!hydrated) {
      throw new FuseError(FuseCodes.ENOENT, `[FUSE - Lazy] Folder not found: ${currentPath}`);
    }

    currentFolder = hydrated;
  }

  return currentFolder;
}
