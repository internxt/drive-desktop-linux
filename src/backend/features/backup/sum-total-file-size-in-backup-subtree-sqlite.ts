import { DriveFilesCollection } from '../../../apps/main/database/collections/DriveFileCollection';
import { DriveFoldersCollection } from '../../../apps/main/database/collections/DriveFolderCollection';
import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';

type Props = {
  files: DriveFilesCollection;
  folders: DriveFoldersCollection;
  rootFolderUuid: string;
};

export async function sumTotalFileSizeInBackupSubtreeSqlite({ files, folders, rootFolderUuid }: Props) {
  let total = 0;
  const queue: string[] = [rootFolderUuid];
  const visitedFolderUuids = new Set<string>();

  while (queue.length > 0) {
    const folderUuid = queue.shift();
    if (folderUuid === undefined || visitedFolderUuids.has(folderUuid)) continue;
    visitedFolderUuids.add(folderUuid);

    const filesInFolder = await files.getAllWhere({
      folderUuid,
      status: DriveItemStatus.EXISTS,
    });

    if (!filesInFolder.success) {
      throw new Error('Failed to list drive files for backup subtree size');
    }

    for (const file of filesInFolder.result) {
      total += file.size;
    }

    const childFolders = await folders.getAllWhere({
      parentUuid: folderUuid,
      status: DriveItemStatus.EXISTS,
    });

    if (!childFolders.success) {
      throw new Error('Failed to list drive folders for backup subtree size');
    }

    for (const child of childFolders.result) {
      queue.push(child.uuid);
    }
  }

  return total;
}
