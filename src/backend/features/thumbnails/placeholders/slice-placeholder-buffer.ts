import type { SlicePlaceholderProps } from './types';

/**
 * Pure function to safely slice the placeholder buffer to match FUSE range requests.
 */
export function slicePlaceholderBuffer({ buffer, offset, length }: SlicePlaceholderProps) {
  if (offset >= buffer.length) {
    return Buffer.alloc(0);
  }
  const end = Math.min(offset + length, buffer.length);
  return buffer.subarray(offset, end);
}
