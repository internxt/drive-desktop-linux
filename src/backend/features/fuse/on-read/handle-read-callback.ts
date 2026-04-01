import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type TemporalFile } from '../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { left, right, type Either } from '../../../../context/shared/domain/Either';
import { type FuseError, FuseNoSuchFileOrDirectoryError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';
import { readChunkFromDisk } from './read-chunk-from-disk';
import { shouldDownload } from '../on-open/open-flags-tracker';
import nodePath from 'node:path';
import { PATHS } from '../../../../core/electron/paths';
import { formatBytes } from '../../../../shared/format-bytes';
import { allocateFile } from './download-cache/allocate-file';
import { expandToBlockBoundaries } from './download-cache/expand-to-block-boundaries';
import { BLOCK_SIZE } from './download-cache/constants';
import {
  type FileHydrationState,
  getOrInitHydrationState,
  isRangeHydrated,
  isFileHydrated,
  getBlocksBeingDownloaded,
  getMissingBlocks,
} from './download-cache/hydration-state';
import { type Network } from '@internxt/sdk';
import { startStopwatch, deleteStopwatch } from './download-cache/hydration-stopwatch';
import { fileExistsOnDisk } from './download-cache/file-exists-on-disk';
import { downloadAndCacheBlock } from './download-cache/download-and-save-block';
import { EMPTY } from './constants';

export type HandleReadCallbackDeps = {
  findVirtualFile: (path: string) => Promise<File | undefined>;
  findTemporalFile: (path: string) => Promise<TemporalFile | undefined>;
  readTemporalFileChunk: (path: string, length: number, position: number) => Promise<Buffer | undefined>;
  onDownloadProgress: (
    name: string,
    extension: string,
    bytesDownloaded: number,
    fileSize: number,
    elapsedTime: number,
  ) => void;
  saveToRepository: (contentsId: string, size: number, uuid: string, name: string, extension: string) => Promise<void>;
  bucketId: string;
  mnemonic: string;
  network: Network.Network;
};

async function readFromTemporalFile(
  deps: HandleReadCallbackDeps,
  path: string,
  length: number,
  position: number,
): Promise<Either<FuseError, Buffer>> {
  const temporalFile = await deps.findTemporalFile(path);

  if (!temporalFile) {
    logger.error({ msg: '[ReadCallback] File not found', path });
    return left(new FuseNoSuchFileOrDirectoryError(path));
  }

  const chunk = await deps.readTemporalFileChunk(temporalFile.path.value, length, position);
  return right(chunk ?? EMPTY);
}

async function ensureFileAllocated(filePath: string, virtualFile: File): Promise<FileHydrationState> {
  const allocated = await fileExistsOnDisk(filePath);
  if (!allocated) {
    await allocateFile(filePath, virtualFile.size);
    startStopwatch(virtualFile.contentsId);
  }
  return getOrInitHydrationState(virtualFile.contentsId, virtualFile.size);
}

async function ensureRangeDownloaded(
  deps: HandleReadCallbackDeps,
  virtualFile: File,
  filePath: string,
  state: FileHydrationState,
  position: number,
  length: number,
): Promise<void> {
  const { blockStart, blockLength } = expandToBlockBoundaries(position, length, virtualFile.size);

  const blocksBeingDownloaded = getBlocksBeingDownloaded(state, { position: blockStart, length: blockLength });
  if (blocksBeingDownloaded.size > 0) {
    logger.debug({ msg: '[ReadCallback] waiting for blocks being downloaded', file: virtualFile.nameWithExtension });
    await Promise.all(blocksBeingDownloaded.values());
  }

  const missingBlocks = getMissingBlocks(state, { position: blockStart, length: blockLength });
  if (missingBlocks.length > 0) {
    logger.debug({ msg: '[ReadCallback] downloading missing blocks', file: virtualFile.nameWithExtension, blocks: missingBlocks });
    await Promise.all(
      missingBlocks.map((block) => {
        const start = block * BLOCK_SIZE;
        const end = Math.min(start + BLOCK_SIZE, virtualFile.size);
        return downloadAndCacheBlock(deps, virtualFile, filePath, state, start, end - start);
      }),
    );
  }
}

async function onFileFullyHydrated(deps: HandleReadCallbackDeps, virtualFile: File): Promise<void> {
  deleteStopwatch(virtualFile.contentsId);
  await deps.saveToRepository(
    virtualFile.contentsId,
    virtualFile.size,
    virtualFile.uuid,
    virtualFile.name,
    virtualFile.type,
  );
}

export async function handleReadCallback(
  deps: HandleReadCallbackDeps,
  path: string,
  length: number,
  position: number,
): Promise<Either<FuseError, Buffer>> {
  const virtualFile = await deps.findVirtualFile(path);

  if (!virtualFile) {
    return readFromTemporalFile(deps, path, length, position);
  }

  if (!shouldDownload(path)) {
    logger.debug({ msg: '[ReadCallback] Download blocked - system open', path });
    return right(EMPTY);
  }

  logger.debug({
    msg: '[ReadCallback] read request:',
    file: virtualFile.nameWithExtension,
    position: formatBytes(position),
    length: formatBytes(length),
  });

  const filePath = nodePath.join(PATHS.DOWNLOADED, virtualFile.contentsId);
  const state = await ensureFileAllocated(filePath, virtualFile);

  if (isRangeHydrated(state, { position, length })) {
    logger.debug({ msg: '[ReadCallback] serving from disk cache', file: virtualFile.nameWithExtension });
    return right(await readChunkFromDisk(filePath, length, position));
  }

  await ensureRangeDownloaded(deps, virtualFile, filePath, state, position, length);

  if (isFileHydrated(state)) {
    await onFileFullyHydrated(deps, virtualFile);
  }

  return right(await readChunkFromDisk(filePath, length, position));
}
