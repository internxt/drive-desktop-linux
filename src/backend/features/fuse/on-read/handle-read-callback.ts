import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type TemporalFile } from '../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { type FuseError, FuseNoSuchFileOrDirectoryError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';
import { type Result } from '../../../../context/shared/domain/Result';
import { readChunkFromDisk } from './read-chunk-from-disk';
import nodePath from 'node:path';
import { PATHS } from '../../../../core/electron/paths';
import { EMPTY } from './constants';
import { PREFETCH_BLOCKS_AHEAD } from './download-cache/constants';
import { readOrHydrate } from './read-or-hydrate';
import { type HandleReadDeps, type ReadRange } from './types';
import { isThumbnailProcess } from './thumbnail-processes';
import { withThumbnailReadSlot } from './thumbnail-read-limiter';
import { THUMBNAIL_WHOLE_FILE_LIMIT } from './thumbnail-read-limits';
import { readThumbnailPrefix } from './read-thumbnail-prefix';

export type HandleReadCallbackProps = HandleReadDeps & {
  findVirtualFile: (path: string) => Promise<File | undefined>;
  findTemporalFile: (path: string) => Promise<TemporalFile | undefined>;
  path: string;
  range: ReadRange;
  processName: string;
  warmLinksAhead?: (path: string, contentsId: string) => void;
};

/**
 * Routes reads between virtual-drive files and temporal local files.
 *
 * Virtual-file reads enforce process policy: blocklisted processes are cache-only
 * readers, while normal processes may hydrate missing cache blocks and finalize the
 * file once the full contents are available.
 */
export async function handleReadCallback({
  findVirtualFile,
  findTemporalFile,
  onDownloadProgress,
  saveToRepository,
  bucketId,
  mnemonic,
  network,
  path,
  range,
  processName,
  warmLinksAhead,
}: HandleReadCallbackProps): Promise<Result<Buffer, FuseError>> {
  const virtualFile = await findVirtualFile(path);

  if (!virtualFile) {
    return readFromTemporalFile(findTemporalFile, path, range.length, range.position);
  }

  const startedAt = Date.now();

  if (isThumbnailProcess(processName)) {
    logger.debug({
      msg: '[ReadCallback] thumbnail process, reading through cache hydration',
      process: processName,
      file: virtualFile.nameWithExtension,
    });

    const filePath = nodePath.join(PATHS.DOWNLOADED, virtualFile.contentsId);
    warmLinksAhead?.(path, virtualFile.contentsId);

    if (virtualFile.size > THUMBNAIL_WHOLE_FILE_LIMIT) {
      return withThumbnailReadSlot(async () => {
        const result = await readThumbnailPrefix({ virtualFile, range, bucketId, mnemonic, network });
        logger.debug({
          msg: '[TIMING] Read (thumbnail prefix)',
          file: virtualFile.nameWithExtension,
          fileSize: virtualFile.size,
          elapsedMs: Date.now() - startedAt,
        });
        return result;
      });
    }

    return withThumbnailReadSlot(async () => {
      const waitedMs = Date.now() - startedAt;
      const result = await readOrHydrate({
        bucketId,
        mnemonic,
        network,
        // Thumbnail reads should not spam progress updates in UI.
        onDownloadProgress: () => undefined,
        // Thumbnail reads should not register files as offline available.
        saveToRepository: async () => undefined,
        virtualFile,
        filePath,
        range,
      });
      logger.debug({
        msg: '[TIMING] Read (thumbnail)',
        file: virtualFile.nameWithExtension,
        process: processName,
        waitedForSlotMs: waitedMs,
        elapsedMs: Date.now() - startedAt,
      });
      return result;
    });
  }

  const filePath = nodePath.join(PATHS.DOWNLOADED, virtualFile.contentsId);

  const result = await readOrHydrate({
    bucketId,
    mnemonic,
    network,
    onDownloadProgress,
    saveToRepository,
    virtualFile,
    filePath,
    range,
    prefetchBlocksAhead: PREFETCH_BLOCKS_AHEAD,
  });
  logger.debug({
    msg: '[TIMING] Read (normal)',
    file: virtualFile.nameWithExtension,
    process: processName,
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}

async function readFromTemporalFile(
  findTemporalFile: HandleReadCallbackProps['findTemporalFile'],
  path: string,
  length: number,
  position: number,
): Promise<Result<Buffer, FuseError>> {
  const temporalFile = await findTemporalFile(path);

  if (!temporalFile || !temporalFile.contentFilePath) {
    logger.error({ msg: '[ReadCallback] File not found', path });
    return { error: new FuseNoSuchFileOrDirectoryError(path) };
  }

  const chunk = await readChunkFromDisk(temporalFile.contentFilePath, length, position);
  return { data: chunk ?? EMPTY };
}
