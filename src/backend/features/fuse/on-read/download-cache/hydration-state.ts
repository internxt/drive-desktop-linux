import { BITS_PER_BYTE, BLOCK_SIZE } from './constants';

/**
 * Tracks which byte ranges of a file have been downloaded and written to disk.
 *
 * Uses a bitmap where each bit represents one 4MB block of the file.
 * A set bit means that block has been FULLY downloaded and written to disk.
 * An unset bit means that block contains pre-allocation zeros — not real data.
 *
 * This is necessary because files are pre-allocated to their full size before any
 * data is downloaded, making it impossible to distinguish real bytes from zeros
 * by inspecting the file alone.
 *
 * A block is only marked after its full write to disk succeeds — never partially.
 * A hard kill mid-write is handled by wiping the download cache on startup.
 *
 * Race conditions: concurrent reads for the same block are tracked via an in-flight
 * set. The second caller waits for the first to finish rather than double-downloading.
 */

export type FileHydrationState = {
  bitmap: Buffer;
  totalBlocks: number;
  downloadedBlocks: number;
  blocksBeingDownloaded: Map<number, Promise<void>>;
};
type Range = {
  position: number;
  length: number;
};
const hydrationState = new Map<string, FileHydrationState>();

export function getOrInitHydrationState(contentsId: string, fileSize: number): FileHydrationState {
  const existing = hydrationState.get(contentsId);
  if (existing) return existing;

  const totalBlocks = Math.ceil(fileSize / BLOCK_SIZE);
  const size = Math.ceil(totalBlocks / BITS_PER_BYTE);
  const state: FileHydrationState = {
    bitmap: Buffer.alloc(size, 0),
    totalBlocks,
    downloadedBlocks: 0,
    blocksBeingDownloaded: new Map(),
  };
  hydrationState.set(contentsId, state);
  return state;
}

function blockIndexForByte(byte: number): number {
  return Math.floor(byte / BLOCK_SIZE);
}

/**
 * Creates a bitmask: a number where exactly ONE bit is turned on.
 *
 * Think of a byte as 8 switches:
 *   [bit7][bit6][bit5][bit4][bit3][bit2][bit1][bit0]
 *
 * The mask selects exactly one of those switches.
 *
 * Examples:
 * bitIndexInByte = 0 is 0b00000001 (selects bit 0)
 * bitIndexInByte = 2 is 0b00000100 (selects bit 2)
 * bitIndexInByte = 7 is 0b10000000 (selects bit 7)
 *
 * Why we need this:
 * - AND (&) with the mask → checks if that bit is set
 * - OR  (|) with the mask → sets that bit
 *
 * Implementation:
 * Start with 1 (0b00000001) and shift it left N times.
 */
function bitMask(bitIndexInByte: number): number {
  return 1 << bitIndexInByte;
}

function getBit(bitmap: Buffer, blockIndex: number): boolean {
  const byteIndex = Math.floor(blockIndex / BITS_PER_BYTE);
  const bitIndexInByte = blockIndex % BITS_PER_BYTE;
  return (bitmap[byteIndex] & bitMask(bitIndexInByte)) !== 0;
}

function setBit(bitmap: Buffer, blockIndex: number): void {
  const byteIndex = Math.floor(blockIndex / BITS_PER_BYTE);
  const bitIndexInByte = blockIndex % BITS_PER_BYTE;
  bitmap[byteIndex] = bitmap[byteIndex] | bitMask(bitIndexInByte);
}

export function isFileHydrated(state: FileHydrationState): boolean {
  return state.downloadedBlocks === state.totalBlocks;
}

function blocksWithinRange({ position, length }: Range): Array<number> {
  const first = blockIndexForByte(position);
  const last = blockIndexForByte(position + length - 1);
  const blocks: number[] = [];
  for (let block = first; block <= last; block++) {
    blocks.push(block);
  }
  return blocks;
}

export function isRangeHydrated(state: FileHydrationState, { position, length }: Range): boolean {
  return blocksWithinRange({ position, length }).every((block) => getBit(state.bitmap, block));
}

export function markBlocksInRangeDownloaded(state: FileHydrationState, { position, length }: Range): void {
  for (const block of blocksWithinRange({ position, length })) {
    if (!getBit(state.bitmap, block)) {
      setBit(state.bitmap, block);
      state.downloadedBlocks++;
    }
  }
}

/**
 * Returns block indices within the range that are neither cached nor currently being downloaded.
 * Use this after waiting for in-flight blocks to find what still needs downloading.
 */
export function getMissingBlocks(state: FileHydrationState, { position, length }: Range): number[] {
  return blocksWithinRange({ position, length }).filter(
    (block) => !getBit(state.bitmap, block) && !state.blocksBeingDownloaded.has(block),
  );
}

export function getBlocksBeingDownloaded(
  state: FileHydrationState,
  { position, length }: Range,
): Map<number, Promise<void>> {
  const blocksBeingDownloadedWithinRange = new Map<number, Promise<void>>();
  for (const block of blocksWithinRange({ position, length })) {
    const existing = state.blocksBeingDownloaded.get(block);
    if (existing) blocksBeingDownloadedWithinRange.set(block, existing);
  }
  return blocksBeingDownloadedWithinRange;
}

/**
 * Marks blocks as being downloaded. Call before starting a download.
 * Returns a resolve function to call it when the download + write completes.
 */
export function startBlockDownload(state: FileHydrationState, { position, length }: Range): () => void {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  for (const block of blocksWithinRange({ position, length })) {
    state.blocksBeingDownloaded.set(block, promise);
  }

  return () => {
    for (const block of blocksWithinRange({ position, length })) {
      state.blocksBeingDownloaded.delete(block);
    }
    resolve();
  };
}

/**
 * Removes the bitmap for a file — call when the file is deleted or cache is cleared.
 */
export function deleteHydrationState(contentsId: string): void {
  hydrationState.delete(contentsId);
}

export function clearHydrationState(): void {
  hydrationState.clear();
}
