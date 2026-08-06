import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../../../../core/electron/paths';
import type { Result } from '../../../../../../context/shared/domain/Result';
import type { EnqueueProps, QueueContext } from './types';
import { drainUploadQueue } from './drain-upload-queue';

export async function enqueueUpload({
  temporalFile,
  path,
  processName,
  repository,
  uploader,
  deleter,
  fileSearcher,
  state,
}: QueueContext & EnqueueProps): Promise<Result<void, Error>> {
  if (state.queuedPaths.has(path)) {
    logger.debug({ msg: '[UploadQueue] Path already queued', path, processName });
    return { data: undefined };
  }

  // Reserve path immediately to avoid duplicate staging when concurrent enqueues race.
  state.queuedPaths.add(path);

  let stagedTemporalFile;

  try {
    stagedTemporalFile = await repository.stage(temporalFile.path, PATHS.UPLOAD_QUEUE);
  } catch (error) {
    state.queuedPaths.delete(path);
    logger.error({ msg: '[UploadQueue] Failed to stage temporal file before enqueue', error, path, processName });
    return { error: error instanceof Error ? error : new Error('Unknown staging error') };
  }

  state.tasks.push({
    temporalFile: stagedTemporalFile,
    path,
    processName,
  });

  void drainUploadQueue({ repository, uploader, deleter, fileSearcher, state });

  return { data: undefined };
}
