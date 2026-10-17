import { BLOCK_SIZE } from '../../fuse/on-read/download-cache/constants';
import { getExistingHydrationState, isRangeHydrated } from '../../fuse/on-read/download-cache/hydration-state';
import { hydrateFileRange } from '../../fuse/on-read/hydrate-file-range';
import type { File } from '../../../../context/virtual-drive/files/domain/File';
import type { Result } from '../../../../context/shared/domain/Result';
import { getThumbnailHydrationTargetBytes } from './thumbnail-hydration-target';

type HydrateFileForThumbnailProps = {
  readonly file: File;
  readonly filePath: string;
  readonly bucketId: string;
  readonly mnemonic: string;
  readonly network: Parameters<typeof hydrateFileRange>[0]['network'];
};

export async function hydrateFileForThumbnail({
  file,
  filePath,
  bucketId,
  mnemonic,
  network,
}: HydrateFileForThumbnailProps): Promise<Result<void>> {
  const targetBytes = getThumbnailHydrationTargetBytes({ file });
  const fileState = getExistingHydrationState(file.contentsId);
  if (fileState && isRangeHydrated(fileState, { position: 0, length: targetBytes })) {
    return { data: undefined };
  }

  for (let position = 0; position < targetBytes; position += BLOCK_SIZE) {
    const length = Math.min(BLOCK_SIZE, targetBytes - position);
    const result = await hydrateFileRange({
      bucketId,
      mnemonic,
      network,
      virtualFile: file,
      filePath,
      range: { position, length },
      onDownloadProgress: () => undefined,
    });

    if (result.error) return { error: result.error };
    if (getExistingHydrationState(file.contentsId)?.abortController.signal.aborted) {
      return { error: new Error('Thumbnail file hydration was aborted') };
    }
  }

  return { data: undefined };
}
