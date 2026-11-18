import type { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { Result } from '../../../../context/shared/domain/Result';
import { requiresThumbnail } from '../placeholders/thumbnail-mime';
import { createConcurrentFolderRunner } from './concurrent-folder-runner';
import { syncThumbnailFolder } from './sync-thumbnail-folder';
import type { ThumbnailFolderTask } from './types';

const runner = createConcurrentFolderRunner({
  processFolder: syncThumbnailFolder,
});

type EnqueueThumbnailFolderProps = {
  readonly folderPath: string;
  readonly fileNames: readonly string[];
  readonly container: Container;
};

export function enqueueThumbnailFolderSync({
  folderPath,
  fileNames,
  container,
}: EnqueueThumbnailFolderProps): Result<void> {
  try {
    const eligibleFileNames = fileNames.filter((fileName) => requiresThumbnail({ fileName }));
    if (eligibleFileNames.length === 0) return { data: undefined };

    const task: ThumbnailFolderTask = {
      folderPath,
      fileNames: Object.freeze(eligibleFileNames),
      container,
      enqueuedAt: Date.now(),
    };

    runner.enqueue({ task });
    return { data: undefined };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to enqueue thumbnail folder sync');
    logger.warn({
      msg: '[THUMBNAIL QUEUE] Failed to enqueue thumbnail folder sync',
      folderPath,
      error: err,
    });
    return { error: err };
  }
}

export function stopThumbnailQueue() {
  runner.abort();
}

export function getThumbnailQueueState() {
  return runner.getState();
}

export function getThumbnailQueueActiveWorkers() {
  return runner.getActiveWorkers();
}
