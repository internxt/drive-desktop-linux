import type { Decipheriv } from 'crypto';
import { ReadableStream } from 'node:stream/web';
import { getDecryptedStream, joinReadableBinaryStreams } from './get-decrypted-stream';

describe('get-decrypted-stream', () => {
  it('should concatenate slices and emit deciphered chunks', async () => {
    // Given
    const sourceA = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.close();
      },
    });
    const sourceB = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([3]));
        controller.close();
      },
    });

    const update = vi.fn((chunk: Uint8Array) => chunk);
    const decipher = { update } as unknown as Decipheriv;

    // When
    const stream = getDecryptedStream({
      encryptedContentSlices: [sourceA, sourceB],
      decipher,
    });
    const reader = stream.getReader();
    const first = await reader.read();
    const second = await reader.read();
    const done = await reader.read();

    // Then
    expect(first.value).toStrictEqual(new Uint8Array([1, 2]));
    expect(second.value).toStrictEqual(new Uint8Array([3]));
    expect(done.done).toBe(true);
    expect(update).toHaveBeenCalledTimes(2);
  });

  describe('joinReadableBinaryStreams', () => {
    it('should join chunks from multiple streams preserving order', async () => {
      // Given
      const sourceA = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.enqueue(new Uint8Array([2]));
          controller.close();
        },
      });
      const sourceB = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([3, 4]));
          controller.close();
        },
      });

      // When
      const stream = joinReadableBinaryStreams({ streams: [sourceA, sourceB] });
      const reader = stream.getReader();
      const first = await reader.read();
      const second = await reader.read();
      const third = await reader.read();
      const done = await reader.read();

      // Then
      expect(first.value).toStrictEqual(new Uint8Array([1]));
      expect(second.value).toStrictEqual(new Uint8Array([2]));
      expect(third.value).toStrictEqual(new Uint8Array([3, 4]));
      expect(done.done).toBe(true);
    });

    it('should close immediately when no streams are provided', async () => {
      // When
      const stream = joinReadableBinaryStreams({ streams: [] });
      const reader = stream.getReader();

      // Then
      const firstRead = await reader.read();
      expect(firstRead.done).toBe(true);
    });

    it('should skip empty streams and continue with the next stream', async () => {
      // Given
      const emptyStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });
      const nonEmptyStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([9]));
          controller.close();
        },
      });

      // When
      const stream = joinReadableBinaryStreams({ streams: [emptyStream, nonEmptyStream] });
      const reader = stream.getReader();
      const first = await reader.read();
      const done = await reader.read();

      // Then
      expect(first.value).toStrictEqual(new Uint8Array([9]));
      expect(done.done).toBe(true);
    });
  });
});
