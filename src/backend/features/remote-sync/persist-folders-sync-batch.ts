import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { createOrUpdateFolderByBatch } from '../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { patchFolder } from './patch-folder';
import type { FolderSyncDto } from './types';

type Props = {
  items: FolderSyncDto[];
};

export async function persistFoldersSyncBatch({ items }: Props) {
  const folders = items.map((item) => patchFolder(item));
  const result = await createOrUpdateFolderByBatch({ folders });

  if (result.error) return Result.err(result.error);

  return Result.ok(undefined);
}
