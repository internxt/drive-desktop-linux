import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type Readable } from 'stream';
import { type TemporalFile } from '../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { left, right, type Either } from '../../../../context/shared/domain/Either';
import { type FuseError, FuseNoSuchFileOrDirectoryError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';
import { tryCatch } from '../../../../shared/try-catch';
import { createDownloadToDisk } from './create-download-to-disk';
import { deleteHydration, getHydration, HydrationEntry, setHydration } from './hydration-registry';
import { readChunkFromDisk } from './read-chunk-from-disk';
import { shouldDownload } from '../on-open/open-flags-tracker';
import nodePath from 'node:path';
import { PATHS } from '../../../../core/electron/paths';
import { formatBytes } from '../../../../shared/format-bytes';

export type HandleReadCallbackDeps = {
  findVirtualFile: (path: string) => Promise<File | undefined>;
  findTemporalFile: (path: string) => Promise<TemporalFile | undefined>;
  readTemporalFileChunk: (path: string, length: number, position: number) => Promise<Buffer | undefined>;
  existsOnDisk: (contentsId: string) => Promise<boolean>;
  startDownload: (virtualFile: File) => Promise<{ stream: Readable; elapsedTime: () => number }>;
  onDownloadProgress: (name: string, extension: string, progress: { percentage: number; elapsedTime: number }) => void;
  saveToRepository: (contentsId: string, size: number, uuid: string, name: string, extension: string) => Promise<void>;
};

const EMPTY = Buffer.alloc(0);

async function startHydration(
  deps: HandleReadCallbackDeps,
  virtualFile: File,
  filePath: string,
): Promise<HydrationEntry> {
  const { stream, elapsedTime } = await deps.startDownload(virtualFile);
  const writer = createDownloadToDisk(stream, filePath, {
    onProgress: (bytesWritten) => {
      deps.onDownloadProgress(virtualFile.name, virtualFile.type, {
        percentage: Math.min(bytesWritten / virtualFile.size, 1),
        elapsedTime: elapsedTime(),
      });
    },
    onFinished: () => {
      deleteHydration(virtualFile.contentsId);
      deps.saveToRepository(
        virtualFile.contentsId,
        virtualFile.size,
        virtualFile.uuid,
        virtualFile.name,
        virtualFile.type,
      );
    },
    onError: (err) => {
      logger.error({ msg: '[startHydration] onError', error: err });
      tryCatch(() => writer.destroy());
      deleteHydration(virtualFile.contentsId);
    },
  });

  setHydration(virtualFile.contentsId, { writer });
  return { writer };
}
export async function handleReadCallback(
  deps: HandleReadCallbackDeps,
  path: string,
  length: number,
  position: number,
): Promise<Either<FuseError, Buffer>> {
  const virtualFile = await deps.findVirtualFile(path);

  if (!virtualFile) {
    const temporalFile = await deps.findTemporalFile(path);

    if (!temporalFile) {
      logger.error({ msg: '[ReadCallback] File not found', path });
      return left(new FuseNoSuchFileOrDirectoryError(path));
    }

    const chunk = await deps.readTemporalFileChunk(temporalFile.path.value, length, position);
    return right(chunk ?? EMPTY);
  }

  if (!shouldDownload(path)) {
    logger.debug({ msg: '[ReadCallback] Download blocked - system open', path });
    return right(EMPTY);
  }

  const filePath = nodePath.join(PATHS.DOWNLOADED, virtualFile.contentsId);

  logger.debug({
    msg: '[ReadCallback] read request:',
    file: virtualFile.nameWithExtension,
    position,
    length,
    targetByte: position + length,
  });

  if (await deps.existsOnDisk(virtualFile.contentsId)) {
    const chunk = await readChunkFromDisk(filePath, length, position);
    return right(chunk);
  }

  const hydration = getHydration(virtualFile.contentsId) ?? (await startHydration(deps, virtualFile, filePath));
  const targetByte = position + length;
  const bytesAvailable = hydration.writer.getBytesAvailable();
  const waitStart = Date.now();

  if (bytesAvailable < targetByte) {
    logger.debug({
      msg: '[ReadCallback] waiting for download to catch up',
      file: virtualFile.nameWithExtension,
      position: formatBytes(position),
      targetByte: formatBytes(targetByte),
      bytesAvailable: formatBytes(bytesAvailable),
      bytesAhead: formatBytes(targetByte - bytesAvailable),
    });
  }

  await hydration.writer.waitForBytes(position, length);

  logger.debug({
    msg: '[ReadCallback] wait resolved',
    file: virtualFile.nameWithExtension,
    position: formatBytes(position),
    waitedMs: Date.now() - waitStart,
  });

  const chunk = await readChunkFromDisk(filePath, length, position);
  return right(chunk);
}
