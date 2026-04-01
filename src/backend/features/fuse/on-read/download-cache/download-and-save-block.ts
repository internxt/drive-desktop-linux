import { HandleReadCallbackDeps } from '../handle-read-callback';
import { writeChunkToDisk } from '../read-chunk-from-disk';
import { type FileHydrationState, markBlocksInRangeDownloaded, startBlockDownload } from './hydration-state';
import { type File } from '../../../../../context/virtual-drive/files/domain/File';
import { downloadFileRange } from '../../../../../infra/environment/download-file/download-file';
import { getStopwatch } from './hydration-stopwatch';

/**
 * Downloads a block range, writes it to disk at the correct offset, and marks it as downloaded.
 */
export async function downloadAndCacheBlock(
  deps: HandleReadCallbackDeps,
  virtualFile: File,
  filePath: string,
  state: FileHydrationState,
  blockStart: number,
  blockLength: number,
): Promise<void> {
  const resolve = startBlockDownload(state, { position: blockStart, length: blockLength });
  try {
    const buffer = await downloadFileRange({
      fileId: virtualFile.contentsId,
      bucketId: deps.bucketId,
      mnemonic: deps.mnemonic,
      network: deps.network,
      range: { position: blockStart, length: blockLength },
      signal: new AbortController(),
    });
    await writeChunkToDisk(filePath, buffer, blockStart);
    markBlocksInRangeDownloaded(state, { position: blockStart, length: blockLength });
    const elapsedTime = getStopwatch(virtualFile.contentsId)?.elapsedTime() ?? 0;
    deps.onDownloadProgress(
      virtualFile.name,
      virtualFile.type,
      blockStart + blockLength,
      virtualFile.size,
      elapsedTime,
    );
  } finally {
    resolve();
  }
}
