import { ReadableStream } from 'node:stream/web';
import { retryWithBackoff } from '../../../../shared/retry-with-backoff';
import { createTransientErrorHandler } from '../../../../backend/common/rate-limit/transient-error-handler';
import { IDownloadParams } from './download.types';
import { runDownloadAttempt } from './run-download-attempt';

export async function downloadFile(params: IDownloadParams): Promise<ReadableStream<Uint8Array>> {
  const signal = params.options?.abortController?.signal ?? new AbortController().signal;
  const state: { lastError?: unknown } = {};
  const onError = createTransientErrorHandler({
    tag: 'BACKUPS',
    context: 'BACKUP DOWNLOAD RETRY',
    path: `${params.bucketId}/${params.fileId}`,
  });
  const operation = runDownloadAttempt.bind(null, {
    params,
    state,
  });

  const result = await retryWithBackoff<ReadableStream<Uint8Array>>(operation, onError, signal);

  if (!result.error) {
    return result.data;
  }

  if (result.error.cause === 'ABORTED') {
    throw new Error('Download aborted');
  }

  throw state.lastError instanceof Error ? state.lastError : result.error;
}
