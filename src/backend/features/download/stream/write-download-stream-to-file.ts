import { mkdir, open } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ReadableStream } from 'node:stream/web';
import { convertToWritableStream } from './convert-to-writable-stream';

type Props = {
  stream: ReadableStream<Uint8Array>;
  tempFilePath: string;
  abortController?: AbortController;
};

export async function writeDownloadStreamToFile({ stream, tempFilePath, abortController }: Props) {
  await mkdir(dirname(tempFilePath), { recursive: true });

  const fileHandle = await open(tempFilePath, 'w');
  const writeStream = fileHandle.createWriteStream();

  try {
    await stream.pipeTo(convertToWritableStream({ writeStream }), {
      signal: abortController?.signal,
    });
  } finally {
    await fileHandle.close().catch(() => undefined);
  }
}
