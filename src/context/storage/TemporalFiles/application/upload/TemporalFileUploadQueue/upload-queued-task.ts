import { logger } from '@internxt/drive-desktop-core/build/backend';
import { FileStatuses } from '../../../../../virtual-drive/files/domain/FileStatus';
import type { FirstsFileSearcher } from '../../../../../virtual-drive/files/application/search/FirstsFileSearcher';
import type { TemporalFileUploader } from '../TemporalFileUploader';
import type { UploadTask } from './types';

type QueueTaskDependencies = {
  task: UploadTask;
  uploader: TemporalFileUploader;
  fileSearcher: FirstsFileSearcher;
};

export async function uploadQueuedTask({ task, uploader, fileSearcher }: QueueTaskDependencies) {
  const existingFile = await fileSearcher.run({ path: task.path, status: FileStatuses.EXISTS });
  const replaces = existingFile
    ? { contentsId: existingFile.contentsId, name: existingFile.name, extension: existingFile.type }
    : undefined;

  await uploader.run(task.temporalFile, replaces);

  logger.debug({ msg: '[UploadQueue] Upload completed', path: task.path, processName: task.processName });
}
