import { createEmptyReadableStream } from './create-empty-readable-stream';

describe('create-empty-readable-stream', () => {
  it('should return a stream that ends immediately', async () => {
    // When
    const stream = createEmptyReadableStream();
    const reader = stream.getReader();
    // Then
    const firstRead = await reader.read();
    expect(firstRead.done).toBe(true);
  });
});
