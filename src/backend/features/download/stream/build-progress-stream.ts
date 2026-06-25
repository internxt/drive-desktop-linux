import { ReadableStream } from 'node:stream/web';

type Props = {
  source: ReadableStream<Uint8Array>;
  onRead: (readBytes: number) => void;
};

export function buildProgressStream({ source, onRead }: Props): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  let readBytes = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const status = await reader.read();

      if (status.done) {
        controller.close();
      } else {
        readBytes += status.value.length;

        onRead(readBytes);
        controller.enqueue(status.value);
      }
    },
    cancel() {
      return reader.cancel();
    },
  });
}
