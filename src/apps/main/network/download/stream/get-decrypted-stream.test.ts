import type { Decipheriv } from 'crypto';
import { getDecryptedStream } from './get-decrypted-stream';

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
});
