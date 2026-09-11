import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type Network } from '@internxt/sdk';
import { canGenerateThumbnail } from '../../thumbnails/thumbnail.extensions';
import { type File } from '../../../../context/virtual-drive/files/domain/File';

const WARM_CONCURRENCY = 5;
const WARM_AHEAD = 20;

type WarmTask = {
  file: File;
  bucketId: string;
  network: Network.Network;
};

const pendingTasks: WarmTask[] = [];
const queuedKeys = new Set<string>();
let activeTasks = 0;

type Props = {
  files: File[];
  bucketId: string;
  network: Network.Network;
  afterContentsId?: string;
};

/**
 * Resolves download links ahead of demand so the network round-trip is already
 * cached by the time GNOME's thumbnailer requests each file's content (see
 * @internxt/sdk's download-links-cache).
 *
 * Re-warming an already cached file is a cache hit, so overlapping windows are cheap.
 */
export function warmDownloadLinks({ files, bucketId, network, afterContentsId }: Props): void {
  const candidates = files.filter((file) => canGenerateThumbnail(file.type));

  const startIndex = afterContentsId ? candidates.findIndex((file) => file.contentsId === afterContentsId) + 1 : 0;
  const window = candidates.slice(startIndex, startIndex + WARM_AHEAD);

  for (const file of window) {
    const key = `${bucketId}:${file.contentsId}`;
    if (queuedKeys.has(key)) continue;

    queuedKeys.add(key);
    pendingTasks.push({ file, bucketId, network });
  }

  drainWarmQueue();
}

function drainWarmQueue() {
  while (activeTasks < WARM_CONCURRENCY && pendingTasks.length > 0) {
    const task = pendingTasks.shift();
    if (!task) return;

    activeTasks++;
    void runWarmTask(task).finally(() => {
      activeTasks--;
      queuedKeys.delete(`${task.bucketId}:${task.file.contentsId}`);
      drainWarmQueue();
    });
  }
}

async function runWarmTask({ file, bucketId, network }: WarmTask) {
  try {
    await network.getDownloadLinks(bucketId, file.contentsId);
  } catch (error) {
    logger.debug({ msg: '[WarmDownloadLinks] Failed to warm link', file: file.nameWithExtension, error });
  }
}
