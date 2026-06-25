import { ReadableStream } from 'node:stream/web';
import { buildProgressStream } from './build-progress-stream';

describe('build-progress-stream', () => {
  it('should report cumulative read bytes while forwarding chunks', async () => {
    // Given
    const progress: number[] = [];
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3]));
        controller.close();
      },
    });
    // When
    const stream = buildProgressStream({
      source,
      onRead: (readBytes) => {
        progress.push(readBytes);
      },
    });

    const reader = stream.getReader();
    const chunk1 = await reader.read();
    const chunk2 = await reader.read();
    const done = await reader.read();

    // Then
    expect(chunk1.value).toStrictEqual(new Uint8Array([1, 2]));
    expect(chunk2.value).toStrictEqual(new Uint8Array([3]));
    expect(done.done).toBe(true);
    expect(progress).toStrictEqual([2, 3]);
  });
});
