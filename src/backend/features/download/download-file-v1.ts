import { createDecipheriv } from 'node:crypto';
import { GenerateFileKey } from '@internxt/inxt-js/build/lib/utils/crypto';
import { ReadableStream } from 'node:stream/web';
import { buildProgressStream } from './stream';
import { IDownloadParams } from './download.types';
import { getFileDownloadStream } from './get-file-download-stream';
import { getRequiredFileMetadata } from './get-required-file-metadata';

export async function downloadFileV1(params: IDownloadParams): Promise<ReadableStream<Uint8Array>> {
  const { data, error } = await getRequiredFileMetadata({
    networkApiUrl: params.networkApiUrl,
    bucketId: params.bucketId,
    fileId: params.fileId,
    creds: params.creds,
    token: params.token,
  });

  if (error) throw error;

  const { mirrors, fileMeta } = data;
  const downloadUrls: string[] = mirrors.map((mirror) => mirror.url);

  const index = Buffer.from(fileMeta.index, 'hex');
  const iv = index.subarray(0, 16);
  const key = params.encryptionKey || (await GenerateFileKey(params.mnemonic!, params.bucketId, index));

  const downloadStream = await getFileDownloadStream({
    downloadUrls,
    decipher: createDecipheriv('aes-256-ctr', Uint8Array.from(key), Uint8Array.from(iv)),
    abortController: params.options?.abortController,
  });

  return buildProgressStream({
    source: downloadStream,
    onRead: (readBytes) => {
      params.options?.notifyProgress(fileMeta.size, readBytes);
    },
  });
}
