import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { FuseError, FuseIOError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';
import { type Result } from '../../../../context/shared/domain/Result';
import { downloadFileRange } from '../../../../infra/environment/download-file/download-file';
import { EMPTY } from './constants';
import { readChunkFromDisk } from './read-chunk-from-disk';
import { fileExistsOnDisk } from './download-cache/file-exists-on-disk';
import { getExistingHydrationState, isRangeHydrated } from './download-cache/hydration-state';
import { type HandleReadDeps, type ReadRange } from './types';

type Props = {
  virtualFile: File;
  filePath: string;
  range: ReadRange;
  bucketId: HandleReadDeps['bucketId'];
  mnemonic: HandleReadDeps['mnemonic'];
  network: HandleReadDeps['network'];
};

export async function readThumbnailPrefix({
  virtualFile,
  filePath,
  range,
  bucketId,
  mnemonic,
  network,
}: Props): Promise<Result<Buffer, FuseError>> {
  const end = Math.min(range.position + range.length, virtualFile.size);
  const length = end - range.position;

  if (length <= 0) return { data: EMPTY };

  const state = getExistingHydrationState(virtualFile.contentsId);
  if (state && isRangeHydrated(state, { position: range.position, length })) {
    const cached = await fileExistsOnDisk(filePath);
    if (cached) {
      return { data: (await readChunkFromDisk(filePath, length, range.position)) ?? EMPTY };
    }
  }

  const download = await downloadFileRange({
    signal: new AbortController().signal,
    fileId: virtualFile.contentsId,
    bucketId,
    mnemonic,
    network,
    range: { position: range.position, length },
  });

  if (download.error) {
    logger.warn({
      msg: '[ReadCallback] thumbnail prefix download failed',
      file: virtualFile.nameWithExtension,
      error: download.error,
    });
    return { error: new FuseIOError(download.error.message) };
  }

  return { data: download.data };
}
