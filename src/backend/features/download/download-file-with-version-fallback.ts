import { FileVersionOneError } from '@internxt/sdk/dist/network/download';
import downloadFileV2 from './downloadv2';
import { IDownloadParams } from './download.types';
import { downloadFileV1 } from './download-file-v1';

export async function downloadFileWithVersionFallback(params: IDownloadParams) {
  try {
    return await downloadFileV2(params);
  } catch (error) {
    if (error instanceof FileVersionOneError) {
      return downloadFileV1(params);
    }

    throw error;
  }
}
