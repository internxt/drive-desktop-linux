import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { SynchronizationPageRequest } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { fetchFoldersSync } from '../../../infra/drive-server/services/folder/services/fetch-folders';

type Props = {
  request: SynchronizationPageRequest;
};

export async function fetchFoldersSyncPage({ request }: Props) {
  logger.debug({ tag: 'SYNC-ENGINE', msg: 'Fetching folders sync page', query: request });
  const result = await fetchFoldersSync(request);

  if (result.error) {
    return Result.err(result.error);
  }

  return Result.ok({
    items: result.data.folders,
    nextCursor: result.data.nextCursor,
  });
}
