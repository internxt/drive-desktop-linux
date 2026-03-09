/**
 * v2.5.4
 * Alexis Mora
 * As per Electron docs, only PNG and JPEG are officially supported
 * https://www.electronjs.org/docs/latest/api/native-image#supported-formats
 */
export const THUMBNAIL_SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);

export function canGenerateThumbnail(extension: string): boolean {
  return THUMBNAIL_SUPPORTED_EXTENSIONS.has(extension.toLowerCase());
}
