import { isThumbnailProcess } from '../../fuse/on-read/thumbnail-processes';
import type { ShouldServePlaceholderProps } from './types';

/**
 * Pure decision function: determines if a FUSE read or attribute inspection
 * should be served via synchronous fake placeholder.
 */
export function shouldServePlaceholder({ processName, isCachedLocally, needsThumbnail }: ShouldServePlaceholderProps) {
  if (isCachedLocally) return false;
  if (!needsThumbnail) return false;
  return isThumbnailProcess(processName);
}
