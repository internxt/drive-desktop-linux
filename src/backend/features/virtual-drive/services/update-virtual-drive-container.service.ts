import { RemoteTreeBuilder } from '../../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { FolderRepositorySynchronizer } from '../../../../context/virtual-drive/folders/application/FolderRepositorySynchronizer/FolderRepositorySynchronizer';
import { FileRepositorySynchronizer } from '../../../../context/virtual-drive/files/application/FileRepositorySynchronizer';
import { StorageRemoteChangesSyncher } from '../../../../context/storage/StorageFiles/application/sync/StorageRemoteChangesSyncher';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { User } from '../../../../apps/main/types';
import { Container } from 'diod';

// This is the old src/apps/drive/fuse/FuseApp.update
export async function updateVirtualDriveContainer({ container, user }: { container: Container; user: User }) {
  try {
    const tree = await container.get(RemoteTreeBuilder).run(user.root_folder_id, user.rootFolderId);
    await Promise.all([
      container.get(FileRepositorySynchronizer).run(tree.files),
      container.get(FolderRepositorySynchronizer).run(tree.folders),
      container.get(StorageRemoteChangesSyncher).run(),
    ]);
    logger.debug({ msg: '[VIRTUAL DRIVE] Tree updated successfully' });
    return { data: true };
  } catch (err) {
    logger.error({ msg: '[VIRTUAL DRIVE] Error updating tree', error: err });
    return { data: false };
  }
}
