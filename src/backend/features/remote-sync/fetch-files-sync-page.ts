import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { SynchronizationPageRequest } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { fetchFilesSync } from '../../../infra/drive-server/services/files/services/fetch-files';

type Props = {
  request: SynchronizationPageRequest;
};

export async function fetchFilesSyncPage({ request }: Props) {
  logger.debug({ tag: 'SYNC-ENGINE', msg: 'Fetching files sync page', query: request });
  const result = await fetchFilesSync(request);

  if (result.error) {
    return Result.err(result.error);
  }

  return Result.ok({
    items: result.data.files,
    nextCursor: result.data.nextCursor,
  });
}
