import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getMediaCategory, requiresThumbnail } from './thumbnail-mime';
import { getPlaceholderBufferByCategory } from './placeholder-buffers';
import { slicePlaceholderBuffer } from './slice-placeholder-buffer';
import { shouldServePlaceholder } from './should-serve-placeholder';

type InterceptThumbnailReadProps = {
  readonly processName: string;
  readonly fileName: string;
  readonly isCachedLocally: boolean;
  readonly offset: number;
  readonly length: number;
};

/**
 * Intercepts FUSE read operations for thumbnailer processes.
 * Returns synchronous placeholder buffer chunks without triggering network or disk blocking.
 */
export function interceptThumbnailRead({
  processName,
  fileName,
  isCachedLocally,
  offset,
  length,
}: InterceptThumbnailReadProps) {
  const needsThumbnail = requiresThumbnail({ fileName });

  if (!shouldServePlaceholder({ processName, isCachedLocally, needsThumbnail })) {
    return undefined;
  }

  logger.debug({
    msg: '[ReadCallback] Intercepted read for thumbnail process, serving placeholder',
    processName,
    fileName,
    offset,
    length,
  });

  const category = getMediaCategory({ fileName });
  const buffer = getPlaceholderBufferByCategory({ category });
  const chunk = slicePlaceholderBuffer({ buffer, offset, length });

  return { data: chunk };
}
