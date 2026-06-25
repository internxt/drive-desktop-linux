import { ReadableStream } from 'node:stream/web';
import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../context/shared/domain/Result';
import { mapDownloadError } from './download.errors';
import { downloadFileWithVersionFallback } from './download-file-with-version-fallback';
import { IDownloadParams } from './download.types';

type Props = {
  params: IDownloadParams;
};

export async function runDownloadAttempt({ params }: Props): Promise<Result<ReadableStream<Uint8Array>, DriveDesktopError>> {
  try {
    const data = await downloadFileWithVersionFallback(params);
    return { data };
  } catch (error) {
    return { error: mapDownloadError(error) };
  }
}
