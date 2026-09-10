import { logger } from '@internxt/drive-desktop-core/build/backend';
import nodePath from 'node:path';
import { canGenerateThumbnail } from '../../thumbnails/thumbnail.extensions';
import { executeAsyncQueue } from '../../../common/async-queue/execute-async-queue';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import { PATHS } from '../../../../core/electron/paths';
import { readOrHydrate } from './read-or-hydrate';
import { THUMBNAIL_WHOLE_FILE_LIMIT } from './thumbnail-read-limits';
import { type HandleReadDeps } from './types';

const PREFETCH_AHEAD = 4;
const PREFETCH_CONCURRENCY = 2;

type Props = {
  files: File[];
  afterContentsId: string;
  bucketId: HandleReadDeps['bucketId'];
  mnemonic: HandleReadDeps['mnemonic'];
  network: HandleReadDeps['network'];
};

export function prefetchThumbnailContent({ files, afterContentsId, bucketId, mnemonic, network }: Props) {
  const candidates = files.filter((file) => canGenerateThumbnail(file.type));
  const startIndex = candidates.findIndex((file) => file.contentsId === afterContentsId) + 1;
  const upcoming = candidates
    .slice(startIndex, startIndex + PREFETCH_AHEAD)
    .filter((file) => file.size <= THUMBNAIL_WHOLE_FILE_LIMIT);

  if (upcoming.length === 0) return;

  void executeAsyncQueue(
    upcoming,
    async (file) => {
      try {
        await readOrHydrate({
          bucketId,
          mnemonic,
          network,
          onDownloadProgress: () => undefined,
          saveToRepository: async () => undefined,
          virtualFile: file,
          filePath: nodePath.join(PATHS.DOWNLOADED, file.contentsId),
          // Any length maps to the whole first block, which is what the thumbnailer reads.
          range: { position: 0, length: 1 },
        });
      } catch (error) {
        logger.debug({ msg: '[PrefetchThumbnailContent] Failed to prefetch', file: file.nameWithExtension, error });
      }
      return { data: undefined };
    },
    { concurrency: PREFETCH_CONCURRENCY, signal: new AbortController().signal },
  );
}
