import { ReadableStream } from 'node:stream/web';
import { retryWithBackoff } from '../../../shared/retry-with-backoff';
import { createTransientErrorHandler } from '../../common/rate-limit/transient-error-handler';
import { IDownloadParams } from './download.types';
import { runDownloadAttempt } from './run-download-attempt';

export async function downloadFile(params: IDownloadParams) {
  const signal = params.options?.abortController?.signal ?? new AbortController().signal;
  const onError = createTransientErrorHandler({
    tag: 'BACKUPS',
    context: 'BACKUP DOWNLOAD RETRY',
    path: `${params.bucketId}/${params.fileId}`,
  });
  const operation = runDownloadAttempt.bind(null, { params });

  return await retryWithBackoff<ReadableStream<Uint8Array>>(operation, onError, signal);
}
