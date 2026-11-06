import { extname } from 'node:path';
import type { MediaCategory, RequiresThumbnailProps } from './types';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'tiff']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv']);

type GetMediaCategoryProps = {
  readonly fileName: string;
};

export function getMediaCategory({ fileName }: GetMediaCategoryProps): MediaCategory {
  const extension = extractNormalizedExtension({ fileName });
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  return 'unknown';
}

export function requiresThumbnail({ fileName, extension }: RequiresThumbnailProps) {
  const ext = extension ? extension.toLowerCase().replace(/^\./, '') : extractNormalizedExtension({ fileName });
  return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
}

function extractNormalizedExtension({ fileName }: { readonly fileName: string }) {
  const rawExt = extname(fileName);
  return rawExt.toLowerCase().replace(/^\./, '');
}
