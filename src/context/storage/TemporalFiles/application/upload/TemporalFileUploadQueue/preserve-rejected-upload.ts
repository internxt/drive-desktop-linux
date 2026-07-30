import { logger } from '@internxt/drive-desktop-core/build/backend';
import { preserveRejectedFileSizeTooBig } from '../../../../../../backend/features/user/file-size-limit';
import type { TemporalFileDeleter } from '../../deletion/TemporalFileDeleter';
import type { UploadTask } from './types';

export async function preserveRejectedUpload({ task, deleter }: { task: UploadTask; deleter: TemporalFileDeleter }) {
  if (!task.temporalFile.contentFilePath) {
    logger.warn({ msg: '[UploadQueue] Rejected file missing content path', path: task.path });
    return;
  }

  const { error } = await preserveRejectedFileSizeTooBig({
    originalPath: task.path,
    temporalContentPath: task.temporalFile.contentFilePath,
    size: task.temporalFile.size.value,
  });

  if (error) {
    logger.error({ msg: '[UploadQueue] Failed to preserve oversized file', error, path: task.path });
    return;
  }

  await deleter.run(task.path);

  logger.warn({ msg: '[UploadQueue] Preserved oversized file after queue rejection', path: task.path });
}
