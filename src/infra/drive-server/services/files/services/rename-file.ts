import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import { Result } from '../../../../../context/shared/domain/Result';
import fetch from 'electron-fetch';
import { FileError } from '../file.error';
import { errorHandler } from './file-error-handler';
import { mapError } from '../../utils/mapError';
import { FileDto } from '../../../out/dto';
import { getNewApiHeaders } from '../../../../../apps/main/auth/service';

type Props = {
  plainName: string;
  type: string;
  fileUuid: string;
};

export async function renameFile({ plainName, type, fileUuid }: Props): Promise<Result<FileDto, FileError>> {
  try {
    const headers = getNewApiHeaders();
    const response = await fetch(`${process.env.NEW_DRIVE_URL}/files/${fileUuid}/meta`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        plainName,
        type,
      }),
    });
    if (response.ok) {
      const data: FileDto = await response.json();
      return { data };
    }
    return errorHandler(response);
  } catch (error) {
    const mappedError = mapError(error);
    logger.error({
      msg: 'Error renaming file',
      error: mappedError.message,
    });
    return {
      error: new FileError('UNKNOWN'),
    };
  }
}
