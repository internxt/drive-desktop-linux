import type { Decipheriv } from 'node:crypto';
import { ReadableStream } from 'node:stream/web';

type JoinPops = { streams: ReadableStream<Uint8Array>[] };

function joinReadableBinaryStreams({ streams }: JoinPops): ReadableStream {
  const streamsCopy = streams.map((stream) => stream);
  let keepReading = true;

  const flush = () => streamsCopy.forEach((stream) => stream.cancel());

  const stream = new ReadableStream({
    async pull(controller) {
      if (!keepReading) return flush();

      const downStream = streamsCopy.shift();

      if (!downStream) {
        return controller.close();
      }

      const reader = downStream.getReader();
      let done = false;

      while (!done && keepReading) {
        const status = await reader.read();

        if (!status.done) {
          controller.enqueue(status.value);
        }

        done = status.done;
      }

      reader.releaseLock();
    },
    cancel() {
      keepReading = false;
    },
  });

  return stream;
}

type Props = {
  encryptedContentSlices: ReadableStream<Uint8Array>[];
  decipher: Decipheriv;
};

export function getDecryptedStream({ encryptedContentSlices, decipher }: Props): ReadableStream<Uint8Array> {
  const encryptedStream = joinReadableBinaryStreams({ streams: encryptedContentSlices });

  let keepReading = true;

  const decryptedStream = new ReadableStream({
    async pull(controller) {
      if (!keepReading) return;

      const reader = encryptedStream.getReader();
      const status = await reader.read();

      if (status.done) {
        controller.close();
      } else {
        controller.enqueue(decipher.update(status.value));
      }

      reader.releaseLock();
    },
    cancel() {
      keepReading = false;
    },
  });

  return decryptedStream;
}
