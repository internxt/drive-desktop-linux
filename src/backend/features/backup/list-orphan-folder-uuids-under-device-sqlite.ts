import { DriveFoldersCollection } from '../../../apps/main/database/collections/DriveFolderCollection';
import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';

type BackupFolderRef = {
  folderUuid: string;
};

type Props = {
  folders: DriveFoldersCollection;
  deviceFolderUuid: string;
  backups: BackupFolderRef[];
};

export async function listOrphanFolderUuidsUnderDeviceSqlite({ folders, deviceFolderUuid, backups }: Props) {
  const backupFolderUuids = new Set(backups.map((b) => b.folderUuid));

  const { success, result } = await folders.getAllWhere({
    parentUuid: deviceFolderUuid,
    status: DriveItemStatus.EXISTS,
  });

  if (!success) {
    throw new Error('Failed to list child folders under device folder');
  }

  return result.filter((folder) => !backupFolderUuids.has(folder.uuid)).map((folder) => folder.uuid);
}
