import { logger } from '@internxt/drive-desktop-core/build/backend';
import { UploadSizeLimitError } from '../../../../../../backend/features/user/file-size-limit/upload-size-limit-error';
import type { QueueContext, QueueState } from './types';
import { preserveRejectedUpload } from './preserve-rejected-upload';
import { uploadQueuedTask } from './upload-queued-task';

type Props = {
  task: QueueState['tasks'][number];
  uploader: QueueContext['uploader'];
  deleter: QueueContext['deleter'];
  fileSearcher: QueueContext['fileSearcher'];
  state: QueueState;
};

async function processTask({ task, uploader, deleter, fileSearcher, state }: Props) {
  try {
    await uploadQueuedTask({ task, uploader, fileSearcher });
    await deleter.run(task.path);
  } catch (error) {
    if (error instanceof UploadSizeLimitError) {
      await preserveRejectedUpload({ task, deleter });
      return;
    }

    logger.error({
      msg: '[UploadQueue] Upload failed, keeping staged file in queue folder',
      error,
      path: task.path,
    });
  } finally {
    state.tasks.shift();
    state.queuedPaths.delete(task.path);
  }
}

export async function drainUploadQueue({
  uploader,
  deleter,
  fileSearcher,
  state,
}: QueueContext & { state: QueueState }) {
  if (state.draining) {
    return;
  }

  state.draining = true;

  try {
    while (state.tasks.length > 0) {
      const task = state.tasks[0];
      await processTask({ task, uploader, deleter, fileSearcher, state });
    }
  } finally {
    state.draining = false;
  }
}
