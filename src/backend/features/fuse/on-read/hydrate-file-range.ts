import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { FuseError } from '../../../../apps/drive/fuse/callbacks/FuseErrors';
import { type Result } from '../../../../context/shared/domain/Result';
import { ensureFileAllocated, ensureRangeDownloaded, fuseIOErrorFrom, wasAborted } from './read-or-hydrate';
import { type HandleReadDeps, type ReadRange } from './types';

export type HydrateFileRangeProps = Pick<HandleReadDeps, 'bucketId' | 'mnemonic' | 'network' | 'onDownloadProgress'> & {
  virtualFile: File;
  filePath: string;
  range: ReadRange;
};

/**
 * Hydrates the requested range into the local cache without reading it back or
 * finalizing the file as an offline download.
 */
export async function hydrateFileRange({
  bucketId,
  mnemonic,
  network,
  virtualFile,
  filePath,
  range,
  onDownloadProgress,
}: HydrateFileRangeProps): Promise<Result<void, FuseError>> {
  const state = await ensureFileAllocated(filePath, virtualFile);
  if (state.error) return { error: state.error };
  if (wasAborted(state.data)) return { data: undefined };

  const result = await ensureRangeDownloaded({
    onDownloadProgress,
    bucketId,
    mnemonic,
    network,
    virtualFile,
    filePath,
    state: state.data,
    range,
  });
  if (wasAborted(state.data)) return { data: undefined };
  if (result.error) return { error: fuseIOErrorFrom(result.error) };
  return { data: undefined };
}
