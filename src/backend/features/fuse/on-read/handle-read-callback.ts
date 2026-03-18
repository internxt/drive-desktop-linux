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

export type HandleReadCallbackDeps = {
  findVirtualFile: (path: string) => Promise<File | undefined>;
  findTemporalFile: (path: string) => Promise<TemporalFile | undefined>;
  readTemporalFileChunk: (path: string, length: number, position: number) => Promise<Buffer | undefined>;
  existsOnDisk: (contentsId: string) => Promise<boolean>;
  startDownload: (virtualFile: File) => Promise<{ stream: Readable; elapsedTime: () => number }>;
  onDownloadProgress: (name: string, extension: string, progress: { percentage: number; elapsedTime: number }) => void;
  saveToRepository: (virtualFile: File) => Promise<void>;
};

const EMPTY = Buffer.alloc(0);

async function startHydration(
  deps: HandleReadCallbackDeps,
  virtualFile: File,
  filePath: string,
): Promise<HydrationEntry> {
  const download = await deps.startDownload(virtualFile);

  const writer = createDownloadToDisk(download.stream, filePath, (bytesWritten) => {
    deps.onDownloadProgress(virtualFile.name, virtualFile.type, {
      percentage: Math.min(bytesWritten / virtualFile.size, 1),
      elapsedTime: download.elapsedTime(),
    });
  });

  const downloadPromise = writer
    .waitForBytes(0, 0)
    .then(() => deps.saveToRepository(virtualFile))
    .catch(() => tryCatch(() => writer.destroy()))
    .finally(() => deleteHydration(virtualFile.contentsId));

  return { writer, downloadPromise };
}
async function getOrStartHydration(
  deps: HandleReadCallbackDeps,
  virtualFile: File,
  filePath: string,
): Promise<HydrationEntry> {
  const existing = getHydration(virtualFile.contentsId);
  if (existing) return existing;

  const entry = await startHydration(deps, virtualFile, filePath);
  setHydration(virtualFile.contentsId, entry);
  return entry;
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

  if (await deps.existsOnDisk(virtualFile.contentsId)) {
    const chunk = await readChunkFromDisk(filePath, length, position);
    return right(chunk);
  }

  const hydration = await getOrStartHydration(deps, virtualFile, filePath);
  await hydration.writer.waitForBytes(position, length);
  const chunk = await readChunkFromDisk(filePath, length, position);
  return right(chunk);
}
