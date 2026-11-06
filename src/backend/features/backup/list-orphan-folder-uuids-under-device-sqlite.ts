import { DriveFoldersCollection } from '../../../apps/main/database/collections/DriveFolderCollection';

const EXISTS_STATUS = 'EXISTS';

type BackupFolderRef = {
  folderId: number;
};

type Props = {
  folders: DriveFoldersCollection;
  deviceFolderId: number;
  backups: BackupFolderRef[];
};

export async function listOrphanFolderUuidsUnderDeviceSqlite({ folders, deviceFolderId, backups }: Props) {
  const backupFolderIds = new Set(backups.map((b) => b.folderId));

  const { success, result } = await folders.getAllWhere({
    parentId: deviceFolderId,
    status: EXISTS_STATUS,
  });

  if (!success) {
    throw new Error('Failed to list child folders under device folder');
  }

  return result.filter((folder) => !backupFolderIds.has(folder.id)).map((folder) => folder.uuid);
}
