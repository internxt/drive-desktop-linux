import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type TemporalFile } from '../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { type FuseError, FuseNoSuchFileOrDirectoryError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';
import { type Result } from '../../../../context/shared/domain/Result';
import { readChunkFromDisk } from './read-chunk-from-disk';
import nodePath from 'node:path';
import { PATHS } from '../../../../core/electron/paths';
import { EMPTY } from './constants';
import { readOrHydrate } from './read-or-hydrate';
import { type HandleReadDeps, type ReadRange } from './types';
import { isThumbnailProcess } from './thumbnail-processes';

const PREFETCH_DEFAULT_BLOCKS_AHEAD = 5;
const PREFETCH_MAX_BLOCKS_AHEAD = 8;

function getPrefetchBlocksAhead({ configuredValue }: { configuredValue: string | undefined }) {
  if (!configuredValue) {
    return PREFETCH_DEFAULT_BLOCKS_AHEAD;
  }

  const parsed = Number.parseInt(configuredValue, 10);
  if (Number.isNaN(parsed)) {
    return PREFETCH_DEFAULT_BLOCKS_AHEAD;
  }

  return Math.max(0, Math.min(parsed, PREFETCH_MAX_BLOCKS_AHEAD));
}

function getThumbnailPrefetchBlocksAhead() {
  return getPrefetchBlocksAhead({
    configuredValue: process.env.INTERNXT_DRIVE_THUMBNAIL_PREFETCH_BLOCKS_AHEAD,
  });
}

function getReadPrefetchBlocksAhead() {
  return getPrefetchBlocksAhead({
    configuredValue: process.env.INTERNXT_DRIVE_READ_PREFETCH_BLOCKS_AHEAD,
  });
}

export type HandleReadCallbackProps = HandleReadDeps & {
  findVirtualFile: (path: string) => Promise<File | undefined>;
  findTemporalFile: (path: string) => Promise<TemporalFile | undefined>;
  path: string;
  range: ReadRange;
  processName: string;
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
}: HandleReadCallbackProps): Promise<Result<Buffer, FuseError>> {
  const virtualFile = await findVirtualFile(path);

  if (!virtualFile) {
    return readFromTemporalFile(findTemporalFile, path, range.length, range.position);
  }

  if (isThumbnailProcess(processName)) {
    logger.debug({
      msg: '[ReadCallback] thumbnail process, reading through cache hydration',
      process: processName,
      file: virtualFile.nameWithExtension,
    });

    const filePath = nodePath.join(PATHS.DOWNLOADED, virtualFile.contentsId);
    return readOrHydrate({
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
      prefetchBlocksAhead: getThumbnailPrefetchBlocksAhead(),
    });
  }

  const filePath = nodePath.join(PATHS.DOWNLOADED, virtualFile.contentsId);

  return readOrHydrate({
    bucketId,
    mnemonic,
    network,
    onDownloadProgress,
    saveToRepository,
    virtualFile,
    filePath,
    range,
    prefetchBlocksAhead: getReadPrefetchBlocksAhead(),
  });
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
