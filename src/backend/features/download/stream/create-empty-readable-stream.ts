import { ReadableStream } from 'node:stream/web';

export function createEmptyReadableStream() {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
}
