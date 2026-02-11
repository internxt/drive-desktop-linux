import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import { components } from './../../../../schemas.d';
import { Result } from './../../../../../context/shared/domain/Result';
import fetch from 'electron-fetch';
import { FileError } from '../file.error';
import { errorHandler } from './file-error-handler';
import { mapError } from '../../utils/mapError';
import { getNewApiHeaders } from '../../../../../apps/main/auth/service';

export async function createThumbnail(
  body: components['schemas']['CreateThumbnailDto'],
): Promise<Result<components['schemas']['ThumbnailDto'], FileError>> {
  try {
    const headers = getNewApiHeaders();
    const response = await fetch(`${process.env.NEW_DRIVE_URL}/files/thumbnail`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const data: components['schemas']['ThumbnailDto'] = await response.json();
      return { data };
    }
    return errorHandler(response);
  } catch (error) {
    const mappedError = mapError(error);
    logger.error({
      msg: 'error creating a thumbnail',
      error: mappedError.message,
    });
    return {
      error: new FileError('UNKNOWN'),
    };
  }
}
