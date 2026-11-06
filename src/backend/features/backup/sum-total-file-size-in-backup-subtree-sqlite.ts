import { DriveFilesCollection } from '../../../apps/main/database/collections/DriveFileCollection';
import { DriveFoldersCollection } from '../../../apps/main/database/collections/DriveFolderCollection';

const EXISTS_STATUS = 'EXISTS';

type Props = {
  files: DriveFilesCollection;
  folders: DriveFoldersCollection;
  rootFolderId: number;
};

export async function sumTotalFileSizeInBackupSubtreeSqlite({ files, folders, rootFolderId }: Props) {
  let total = 0;
  const queue: number[] = [rootFolderId];
  const visitedFolderIds = new Set<number>();

  while (queue.length > 0) {
    const folderId = queue.shift();
    if (folderId === undefined || visitedFolderIds.has(folderId)) continue;
    visitedFolderIds.add(folderId);

    const filesInFolder = await files.getAllWhere({
      folderId,
      status: EXISTS_STATUS,
    });

    if (!filesInFolder.success) {
      throw new Error('Failed to list drive files for backup subtree size');
    }

    for (const file of filesInFolder.result) {
      total += file.size;
    }

    const childFolders = await folders.getAllWhere({
      parentId: folderId,
      status: EXISTS_STATUS,
    });

    if (!childFolders.success) {
      throw new Error('Failed to list drive folders for backup subtree size');
    }

    for (const child of childFolders.result) {
      queue.push(child.id);
    }
  }

  return total;
}
