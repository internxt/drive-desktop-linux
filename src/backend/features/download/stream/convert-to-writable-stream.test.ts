import type { WriteStream } from 'node:fs';
import { convertToWritableStream } from './convert-to-writable-stream';

describe('convert-to-writable-stream', () => {
  it('should delegate write and end to the target stream', async () => {
    // Given
    const write = vi.fn((_chunk: Buffer, cb: (error?: Error | null) => void) => cb(null));
    const end = vi.fn((cb: (error?: Error | null) => void) => cb(null));
    const destroy = vi.fn();

    const writeStream = {
      write,
      end,
      destroy,
    } as unknown as WriteStream;

    const stream = convertToWritableStream({ writeStream });
    const writer = stream.getWriter();

    // When
    await writer.write(new Uint8Array([1, 2, 3]));
    await writer.close();

    // Then
    expect(write).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(0);
  });

  it('should delegate abort to destroy', async () => {
    // Given
    const write = vi.fn((_chunk: Buffer, cb: (error?: Error | null) => void) => cb(null));
    const end = vi.fn((cb: (error?: Error | null) => void) => cb(null));
    const destroy = vi.fn();

    const writeStream = {
      write,
      end,
      destroy,
    } as unknown as WriteStream;

    const stream = convertToWritableStream({ writeStream });
    const writer = stream.getWriter();

    // When
    await writer.abort(new Error('stop'));

    // Then
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
