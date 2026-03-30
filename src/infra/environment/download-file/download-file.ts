import { DecryptFileFunction, DownloadFileFunction } from '@internxt/sdk/dist/network';
import { downloadFile as sdkDownloadFile } from '@internxt/sdk/dist/network/download';
import axios from 'axios';
import { buildCryptoLib } from './build-crypto-lib';
import { DownloadFileProps } from './types';
import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { decryptAtOffset } from './decrypt-at-offset';

async function fetchEncryptedRange(url: string, position: number, length: number): Promise<Buffer> {
  const response = await axios.get<NodeJS.ReadableStream>(url, {
    responseType: 'stream',
    headers: {
      range: `bytes=${position}-${position + length - 1}`,
    },
  });

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    response.data.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    response.data.on('end', () => resolve(Buffer.concat(chunks)));
    response.data.on('error', reject);
  });
}



export async function downloadFileRange({
  signal,
  fileId,
  bucketId,
  mnemonic,
  network,
  range,
}: DownloadFileProps): Promise<Buffer> {
  let encryptedBytes: Buffer | undefined;
  let decryptedBuffer: Buffer | undefined;

  const downloadFileCb: DownloadFileFunction = async (downloadables) => {
    if (range && downloadables.length > 1) {
      throw new Error('Multi-Part Download with Range-Requests is not implemented');
    }
    for (const downloadable of downloadables) {
      if (signal.signal.aborted) {
        throw new DriveDesktopError('ABORTED');
      }
      // eslint-disable-next-line no-await-in-loop
      encryptedBytes = await fetchEncryptedRange(downloadable.url, range.position, range.length);
    }
  };

  const decryptFileCb: DecryptFileFunction = async (_, key, iv) => {
    if (!encryptedBytes) throw new Error('No encrypted bytes to decrypt');
    decryptedBuffer = decryptAtOffset(
      encryptedBytes,
      Buffer.from(key.toString('hex'), 'hex'),
      Buffer.from(iv.toString('hex'), 'hex'),
      range.position,
    );
  };

  await sdkDownloadFile(
    fileId,
    bucketId,
    mnemonic,
    network,
    buildCryptoLib(),
    Buffer.from,
    downloadFileCb,
    decryptFileCb,
  );

  if (!decryptedBuffer) throw new Error('Decryption did not produce a buffer');
  return decryptedBuffer;
}
