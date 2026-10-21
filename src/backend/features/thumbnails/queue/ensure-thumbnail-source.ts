import { join } from 'node:path';
import { PATHS } from '../../../../core/electron/paths';
import type { File } from '../../../../context/virtual-drive/files/domain/File';
import {
  clearHydrationStateForFile,
  getExistingHydrationState,
  isRangeHydrated,
} from '../../fuse/on-read/download-cache/hydration-state';
import { fileExistsOnDisk } from '../../fuse/on-read/download-cache/file-exists-on-disk';
import { hydrateFileForThumbnail } from './hydrate-file-for-thumbnail';
import { getThumbnailHydrationTargetBytes } from './thumbnail-hydration-target';

type EnsureThumbnailSourceProps = {
  readonly file: File;
  readonly bucketId: string;
  readonly mnemonic: string;
  readonly network: Parameters<typeof hydrateFileForThumbnail>[0]['network'];
};

export async function ensureThumbnailSource({ file, bucketId, mnemonic, network }: EnsureThumbnailSourceProps) {
  const cachePath = join(PATHS.DOWNLOADED, file.contentsId);
  const targetBytes = getThumbnailHydrationTargetBytes({ file });
  const existingState = getExistingHydrationState(file.contentsId);
  const isTargetHydrated = existingState ? isRangeHydrated(existingState, { position: 0, length: targetBytes }) : false;

  if (isTargetHydrated && (await fileExistsOnDisk(cachePath))) {
    return { data: cachePath };
  }

  if (isTargetHydrated) {
    clearHydrationStateForFile({ contentsId: file.contentsId });
  }

  const result = await hydrateFileForThumbnail({
    file,
    filePath: cachePath,
    bucketId,
    mnemonic,
    network,
  });

  if (result.error) return { error: result.error };
  return { data: cachePath };
}
