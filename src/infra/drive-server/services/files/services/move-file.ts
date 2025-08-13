import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import { Result } from '../../../../../context/shared/domain/Result';
import fetch from 'electron-fetch';
import { getNewApiHeaders } from 'src/apps/main/auth/service';
import { FileError } from '../file.error';
import { errorHandler } from './file-error-handler';

export async function moveFile({
  destinationFolder,
  uuid,
}: {
  destinationFolder: string;
  uuid: string;
}): Promise<Result<boolean, FileError>> {
  try {
    const response = await fetch(`${process.env.NEW_DRIVE_URL}/files/${uuid}`, {
      method: 'PATCH',
      headers: getNewApiHeaders(),
      body: JSON.stringify({
        destinationFolder,
      }),
    });
    if (response.ok) {
      return { data: true };
    }
    return errorHandler(response);
  } catch (error) {
    logger.error({
      msg: 'Error moving file',
      error,
    });
    return {
      error: new FileError('UNKNOWN'),
    };
  }
}
