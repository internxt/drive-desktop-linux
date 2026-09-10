import { logger } from '@internxt/drive-desktop-core/build/backend';
import nodePath from 'node:path';
import { canGenerateThumbnail } from '../../thumbnails/thumbnail.extensions';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { PATHS } from '../../../../core/electron/paths';
import { readOrHydrate } from './read-or-hydrate';
import { THUMBNAIL_WHOLE_FILE_LIMIT } from './thumbnail-read-limits';
import { type HandleReadDeps } from './types';

const PREFETCH_AHEAD = 4;
const PREFETCH_CONCURRENCY = 2;

type PrefetchTask = {
  file: File;
  bucketId: HandleReadDeps['bucketId'];
  mnemonic: HandleReadDeps['mnemonic'];
  network: HandleReadDeps['network'];
};

const pendingTasks: PrefetchTask[] = [];
const queuedContentsIds = new Set<string>();
let activeTasks = 0;

type Props = {
  files: File[];
  afterContentsId: string;
  bucketId: HandleReadDeps['bucketId'];
  mnemonic: HandleReadDeps['mnemonic'];
  network: HandleReadDeps['network'];
};

export function prefetchThumbnailContent({ files, afterContentsId, bucketId, mnemonic, network }: Props) {
  const candidates = files.filter((file) => canGenerateThumbnail(file.type));
  const startIndex = candidates.findIndex((file) => file.contentsId === afterContentsId) + 1;
  const upcoming = candidates
    .slice(startIndex, startIndex + PREFETCH_AHEAD)
    .filter((file) => file.size <= THUMBNAIL_WHOLE_FILE_LIMIT);

  for (const file of upcoming) {
    if (queuedContentsIds.has(file.contentsId)) continue;

    queuedContentsIds.add(file.contentsId);
    pendingTasks.push({ file, bucketId, mnemonic, network });
  }

  drainPrefetchQueue();
}

function drainPrefetchQueue() {
  while (activeTasks < PREFETCH_CONCURRENCY && pendingTasks.length > 0) {
    const task = pendingTasks.shift();
    if (!task) return;

    activeTasks++;
    void runPrefetchTask(task).finally(() => {
      activeTasks--;
      queuedContentsIds.delete(task.file.contentsId);
      drainPrefetchQueue();
    });
  }
}

async function runPrefetchTask({ file, bucketId, mnemonic, network }: PrefetchTask) {
  try {
    await readOrHydrate({
      bucketId,
      mnemonic,
      network,
      onDownloadProgress: () => undefined,
      saveToRepository: async () => undefined,
      virtualFile: file,
      filePath: nodePath.join(PATHS.DOWNLOADED, file.contentsId),
      // Any length maps to the whole first block, which is what the thumbnailer reads.
      range: { position: 0, length: 1 },
    });
  } catch (error) {
    logger.debug({ msg: '[PrefetchThumbnailContent] Failed to prefetch', file: file.nameWithExtension, error });
  }
}
