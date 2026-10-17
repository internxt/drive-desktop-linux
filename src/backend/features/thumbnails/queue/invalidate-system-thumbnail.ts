import { createHash } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../../core/electron/paths';

const THUMBNAIL_CACHE_TYPES = ['normal', 'large', 'fail'] as const;

type InvalidateSystemThumbnailProps = {
  readonly filePath: string;
};

export async function invalidateSystemThumbnail({ filePath }: InvalidateSystemThumbnailProps) {
  const uri = pathToFileURL(filePath).href;
  const cacheKey = createHash('md5').update(uri).digest('hex');

  const results = await Promise.all(
    THUMBNAIL_CACHE_TYPES.map(async (cacheType) => {
      const thumbnailPath = join(PATHS.THUMBNAILS_FOLDER, cacheType, `${cacheKey}.png`);
      try {
        await unlink(thumbnailPath);
        return undefined;
      } catch (error) {
        if (isMissingFileError(error)) return undefined;
        return { thumbnailPath, error };
      }
    }),
  );

  for (const result of results) {
    if (!result) continue;
    logger.warn({
      msg: '[THUMBNAIL QUEUE] Could not invalidate system thumbnail cache entry',
      thumbnailPath: result.thumbnailPath,
      error: result.error,
    });
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
