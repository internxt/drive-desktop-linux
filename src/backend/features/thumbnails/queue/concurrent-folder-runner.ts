import { logger } from '@internxt/drive-desktop-core/build/backend';
import { queue } from 'async';
import type { ThumbnailFolderTask, ThumbnailQueueState } from './types';

const MAX_CONCURRENT_FOLDERS = 2;
const MAX_COMPLETED_CACHE_SIZE = 1000;

type ConcurrentFolderRunnerProps = {
  readonly processFolder: (task: ThumbnailFolderTask) => Promise<void | boolean>;
  readonly concurrency?: number;
};

export function createConcurrentFolderRunner({
  processFolder,
  concurrency = MAX_CONCURRENT_FOLDERS,
}: ConcurrentFolderRunnerProps) {
  const scheduledFolders = new Map<string, ThumbnailFolderTask>();
  const processing = new Set<string>();
  const completed = new Set<string>();
  const taskQueue = queue(runTask, concurrency);

  function enqueue({ task }: { readonly task: ThumbnailFolderTask }) {
    if (scheduledFolders.has(task.folderPath) || completed.has(getTaskKey({ task }))) return;
    const scheduledTask = Object.freeze({ ...task, fileNames: Object.freeze([...task.fileNames]) });
    scheduledFolders.set(task.folderPath, scheduledTask);
    void taskQueue.push(scheduledTask);
  }

  async function runTask(task: ThumbnailFolderTask) {
    processing.add(task.folderPath);
    try {
      logger.debug({
        msg: '[THUMBNAIL QUEUE] Processing folder',
        folderPath: task.folderPath,
        activeWorkers: taskQueue.running(),
      });
      if ((await processFolder(task)) !== false) {
        addCompletedKey(getTaskKey({ task }));
      }
    } catch (error) {
      logger.error({
        msg: '[THUMBNAIL QUEUE] Failed to process folder',
        folderPath: task.folderPath,
        error,
      });
    } finally {
      processing.delete(task.folderPath);
      scheduledFolders.delete(task.folderPath);
    }
  }

  function addCompletedKey(key: string) {
    if (completed.size >= MAX_COMPLETED_CACHE_SIZE) {
      const oldestKey = completed.values().next().value;
      if (oldestKey !== undefined) {
        completed.delete(oldestKey);
      }
    }
    completed.add(key);
  }

  function abort(): void {
    taskQueue.kill();
    scheduledFolders.clear();
    processing.clear();
  }

  function getState(): ThumbnailQueueState {
    return Object.freeze({
      items: Object.freeze([...scheduledFolders.values()].filter((task) => !processing.has(task.folderPath))),
      processing: new Set(processing),
      completed: new Set(completed),
    });
  }

  function getActiveWorkers() {
    return taskQueue.running();
  }

  return Object.freeze({ enqueue, abort, getState, getActiveWorkers });
}

function getTaskKey({ task }: { readonly task: ThumbnailFolderTask }) {
  return JSON.stringify([task.folderPath, [...task.fileNames].sort()]);
}
