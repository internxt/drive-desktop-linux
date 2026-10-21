import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { createOrUpdateFileByBatch } from '../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { DirectoryStateRepository } from '../virtual-drive/services/lazy/directory-state-sqlite-repository';
import { filterStaleRemoteFiles } from './filter-stale-remote-items';
import { mapFile } from './map-file';
import type { FileSyncDto } from './types';

type Props = {
  items: FileSyncDto[];
};

export async function persistFilesSyncBatch({ items }: Props) {
  const freshDirectoryStates = await DirectoryStateRepository.getFreshDirectoryStates();
  const { filesToPersist, foldersToInvalidate } = filterStaleRemoteFiles({
    files: items.map(mapFile),
    freshDirectoryStates,
  });
  const persistResult = await createOrUpdateFileByBatch({ files: filesToPersist });

  if (persistResult.error) return Result.err(persistResult.error);

  await Promise.all(
    [...foldersToInvalidate].map((folderId) =>
      DirectoryStateRepository.invalidate({ folderId, statusScope: 'EXISTS' }),
    ),
  );

  return Result.ok(undefined);
}
