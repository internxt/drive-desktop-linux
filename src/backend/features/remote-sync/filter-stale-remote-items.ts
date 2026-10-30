import { RemoteSyncedFile, RemoteSyncedFolder } from '../../../apps/main/remote-sync/helpers';

type FilterFilesProps = {
  files: RemoteSyncedFile[];
  freshDirectoryStates: Map<string, Date>;
};

type FilterFoldersProps = {
  folders: RemoteSyncedFolder[];
  freshDirectoryStates: Map<string, Date>;
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
  const foldersToInvalidate = new Set<string>();

  for (const file of files) {
    const loadedAt = freshDirectoryStates.get(file.folderUuid);
    if (!loadedAt) {
      filesToPersist.push(file);
      continue;
    }

    const fileUpdatedAt = new Date(file.updatedAt).getTime();
    if (fileUpdatedAt <= loadedAt.getTime()) {
      continue;
    }

    filesToPersist.push(file);
    foldersToInvalidate.add(file.folderUuid);
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
  const foldersToInvalidate = new Set<string>();

  for (const folder of folders) {
    if (!folder.parentUuid) {
      foldersToPersist.push(folder);
      continue;
    }

    const parentLoadedAt = freshDirectoryStates.get(folder.parentUuid);
    if (!parentLoadedAt) {
      foldersToPersist.push(folder);
      continue;
    }

    const folderUpdatedAt = new Date(folder.updatedAt).getTime();
    if (folderUpdatedAt <= parentLoadedAt.getTime()) {
      continue;
    }

    foldersToPersist.push(folder);
    foldersToInvalidate.add(folder.parentUuid);
  }

  return { foldersToPersist, foldersToInvalidate };
}
