import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import { Result } from '../../../../../context/shared/domain/Result';
import fetch from 'electron-fetch';
import { FileError } from '../file.error';
import { errorHandler } from './file-error-handler';
import { mapError } from '../../utils/mapError';
import { getNewApiHeaders } from '../../../../../apps/main/auth/service';

export async function moveFile({
  destinationFolder,
  uuid,
}: {
  destinationFolder: string;
  uuid: string;
}): Promise<Result<boolean, FileError>> {
  try {
    const headers = getNewApiHeaders();

    const response = await fetch(`${process.env.NEW_DRIVE_URL}/files/${uuid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        destinationFolder,
      }),
    });
    if (response.ok) {
      return { data: true };
    }
    return errorHandler(response);
  } catch (error) {
    const mappedError = mapError(error);
    logger.error({
      msg: 'Error moving file',
      error: mappedError.message,
    });
    return {
      error: new FileError('UNKNOWN'),
    };
  }
}
