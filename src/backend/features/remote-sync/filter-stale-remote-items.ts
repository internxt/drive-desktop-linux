import { RemoteSyncedFile, RemoteSyncedFolder } from '../../../apps/main/remote-sync/helpers';

type FilterFilesProps = {
  files: RemoteSyncedFile[];
  freshDirectoryStates: Map<number, Date>;
};

type FilterFoldersProps = {
  folders: RemoteSyncedFolder[];
  freshDirectoryStates: Map<number, Date>;
};

/**
 * Filters out remote files from background sync when their parent directory
 * was recently lazily synchronized and the incoming file record is older than
 * or equal to that snapshot. If a file was updated AFTER the directory was
 * synchronized, it is retained and the parent folder's directory state is
 * marked for invalidation so future access re-verifies.
 */
export function filterStaleRemoteFiles({ files, freshDirectoryStates }: FilterFilesProps) {
  const filesToPersist: RemoteSyncedFile[] = [];
  const foldersToInvalidate = new Set<number>();

  for (const file of files) {
    const loadedAt = freshDirectoryStates.get(file.folderId);
    if (!loadedAt) {
      filesToPersist.push(file);
      continue;
    }

    const fileUpdatedAt = new Date(file.updatedAt).getTime();
    if (fileUpdatedAt <= loadedAt.getTime()) {
      // Incoming file is older than or concurrent with the fresh lazy directory snapshot.
      // Skip it to avoid overwriting newer or cleanly verified metadata.
      continue;
    }

    // Incoming file is genuinely newer than the last directory sync.
    filesToPersist.push(file);
    foldersToInvalidate.add(file.folderId);
  }

  return { filesToPersist, foldersToInvalidate };
}

/**
 * Filters out remote folders from background sync when their parent directory
 * was recently lazily synchronized and the incoming folder record is older than
 * or equal to that snapshot.
 */
export function filterStaleRemoteFolders({ folders, freshDirectoryStates }: FilterFoldersProps) {
  const foldersToPersist: RemoteSyncedFolder[] = [];
  const foldersToInvalidate = new Set<number>();

  for (const folder of folders) {
    if (folder.parentId === null) {
      foldersToPersist.push(folder);
      continue;
    }

    const parentLoadedAt = freshDirectoryStates.get(folder.parentId);
    if (!parentLoadedAt) {
      foldersToPersist.push(folder);
      continue;
    }

    const folderUpdatedAt = new Date(folder.updatedAt).getTime();
    if (folderUpdatedAt <= parentLoadedAt.getTime()) {
      // Incoming folder was already indexed in the parent folder's fresh snapshot.
      continue;
    }

    foldersToPersist.push(folder);
    foldersToInvalidate.add(folder.parentId);
  }

  return { foldersToPersist, foldersToInvalidate };
}
