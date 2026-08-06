import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../../apps/drive/fuse/callbacks/FuseErrors';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';

export async function resolveRootFolder({ folderRepository }: { folderRepository: FolderRepository }) {
  const root = folderRepository.matchingPartial({ path: '/' })[0];

  if (!root) {
    throw new FuseError(FuseCodes.EIO, '[FUSE - Lazy] Root folder not initialized');
  }

  return root;
}
