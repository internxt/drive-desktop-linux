import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { createOrUpdateFileByBatch } from '../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { mapFile } from './map-file';
import type { FileSyncDto } from './types';

type Props = {
  items: FileSyncDto[];
};

export async function persistFilesSyncBatch({ items }: Props) {
  const files = items.map(mapFile);
  const persistResult = await createOrUpdateFileByBatch({ files });

  if (persistResult.error) return Result.err(persistResult.error);

  return Result.ok(undefined);
}
