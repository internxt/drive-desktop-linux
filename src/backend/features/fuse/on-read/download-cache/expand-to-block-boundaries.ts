import { ReadRange } from '../types';
import { BLOCK_SIZE } from './constants';

/**
 * Given a position and length, rounds up to 4MB block boundaries so that every
 * request downloads complete blocks. Ensuring correct bitmap tracking, prefetching,
 * and preventing double downloads.
 */
export function expandToBlockBoundaries({ range, fileSize }: { range: ReadRange; fileSize: number }): {
  blockStart: number;
  blockLength: number;
} {
  if (fileSize <= 0 || range.length <= 0 || range.position >= fileSize) {
    return { blockStart: Math.max(0, Math.min(range.position, fileSize)), blockLength: 0 };
  }

  const clampedStart = Math.max(0, range.position);
  const clampedEndExclusive = Math.min(clampedStart + range.length, fileSize);

  if (clampedEndExclusive <= clampedStart) {
    return { blockStart: clampedStart, blockLength: 0 };
  }

  const blockStart = Math.floor(clampedStart / BLOCK_SIZE) * BLOCK_SIZE;
  const blockEnd = Math.min(Math.ceil(clampedEndExclusive / BLOCK_SIZE) * BLOCK_SIZE, fileSize);
  return { blockStart, blockLength: blockEnd - blockStart };
}
