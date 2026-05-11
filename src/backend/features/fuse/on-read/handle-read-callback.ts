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
}: HandleReadCallbackProps): Promise<Result<Buffer, FuseError>> {
  const virtualFile = await findVirtualFile(path);

  if (!virtualFile) {
    return readFromTemporalFile(findTemporalFile, path, range.length, range.position);
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
