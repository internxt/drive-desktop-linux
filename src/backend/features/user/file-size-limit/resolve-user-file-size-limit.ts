import { logger } from '@internxt/drive-desktop-core/build/backend';
import configStore from '../../../../apps/main/config';
import { getUserFileSizeLimit } from '../../../../infra/drive-server/services/files/services/get-user-file-size-limit';

const FILE_SIZE_LIMIT_REQUEST_TIMEOUT_MS = 10_000;

type Props = {
  signal?: AbortSignal;
};

/**
 * v2.7.0 Esteban
 * Login and an upload waiting on the limit share this request: one attempt, aborted after 10s.
 * A failed response stays an error. Returning the stored limit would make the core save it as a fresh
 * confirmation and skip the backend for 15 minutes. The previous limit stays in the config store.
 */
export async function resolveUserFileSizeLimit({
  signal = AbortSignal.timeout(FILE_SIZE_LIMIT_REQUEST_TIMEOUT_MS),
}: Props = {}) {
  const { data, error } = await getUserFileSizeLimit({ signal });

  if (data) {
    configStore.set('maxUploadFileSizeInBytes', data);
    logger.debug({
      tag: 'SYNC-ENGINE',
      msg: 'Resolved user file size limit from API',
    });

    return { data };
  }

  logger.error({
    tag: 'SYNC-ENGINE',
    msg: 'Unable to resolve user file size limit',
    error,
  });

  return { error: error ?? new Error('Unable to resolve user file size limit') };
}
