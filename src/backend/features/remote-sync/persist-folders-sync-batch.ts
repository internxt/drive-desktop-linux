import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { createOrUpdateFolderByBatch } from '../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { DirectoryStateRepository } from '../virtual-drive/services/lazy/directory-state-sqlite-repository';
import { runWithDirectoryMetadataWriteLock } from '../virtual-drive/services/lazy/run-with-directory-metadata-write-lock';
import { filterStaleRemoteFolders } from './filter-stale-remote-items';
import { mapFolder } from './map-folder';
import type { FolderSyncDto } from './types';

type Props = {
  items: FolderSyncDto[];
};

async function writeFoldersFromFreshSnapshot({ items }: Props) {
  const freshDirectoryStates = await DirectoryStateRepository.getFreshDirectoryStates();
  const { foldersToPersist, foldersToInvalidate } = filterStaleRemoteFolders({
    folders: items.map(mapFolder),
    freshDirectoryStates,
  });
  const result = await createOrUpdateFolderByBatch({ folders: foldersToPersist });

  if (result.error) return Result.err(result.error);

  await Promise.all(
    [...foldersToInvalidate].map((folderId) =>
      DirectoryStateRepository.invalidate({ folderId, statusScope: 'EXISTS' }),
    ),
  );

  return Result.ok(undefined);
}

export function persistFoldersSyncBatch({ items }: Props) {
  return runWithDirectoryMetadataWriteLock({
    operation: () => writeFoldersFromFreshSnapshot({ items }),
  });
}
