import type { MediaCategory } from './types';

/**
 * 1x1 transparent PNG pre-compiled into an immutable buffer.
 * In-memory zero-allocation response for thumbnail placeholder requests.
 */
const TRANSPARENT_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const PLACEHOLDER_BUFFERS: Readonly<Record<MediaCategory, Buffer>> = Object.freeze({
  image: TRANSPARENT_1X1_PNG,
  video: TRANSPARENT_1X1_PNG,
  document: TRANSPARENT_1X1_PNG,
  audio: TRANSPARENT_1X1_PNG,
  unknown: TRANSPARENT_1X1_PNG,
});

type GetPlaceholderBufferProps = {
  readonly category: MediaCategory;
};

export function getPlaceholderBufferByCategory({ category }: GetPlaceholderBufferProps) {
  return PLACEHOLDER_BUFFERS[category] ?? TRANSPARENT_1X1_PNG;
}
