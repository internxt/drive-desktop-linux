import { Decipheriv } from 'node:crypto';
import fetch from 'electron-fetch';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { convertToReadableStream } from '../../../apps/main/network/NetworkFacade';
import { getDecryptedStream } from './stream';

type Props = {
  downloadUrls: string[];
  decipher: Decipheriv;
  abortController?: AbortController;
};

export async function getFileDownloadStream({
  downloadUrls,
  decipher,
  abortController,
}: Props): Promise<ReadableStream> {
  const encryptedContentParts: ReadableStream<Uint8Array>[] = [];

  for (const downloadUrl of downloadUrls) {
    if (abortController?.signal.aborted) {
      throw new Error('Download aborted');
    }

    const encryptedStream = await fetch(downloadUrl, {
      signal: abortController?.signal,
    });

    if (!encryptedStream.body) {
      throw new Error('No content received');
    }

    encryptedContentParts.push(convertToReadableStream(encryptedStream.body as Readable));
  }

  return getDecryptedStream({ encryptedContentSlices: encryptedContentParts, decipher });
}
