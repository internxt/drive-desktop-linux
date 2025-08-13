import { components } from './../../../../schemas.d';
import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import { Result } from '../../../../../context/shared/domain/Result';
import fetch from 'electron-fetch';
import { getNewApiHeaders } from 'src/apps/main/auth/service';
import { FileError } from '../file.error';
import { errorHandler } from './file-error-handler';

export async function renameFile({
  plainName,
  type,
  folderUuid,
}: {
  plainName: string;
  type: string;
  folderUuid: string;
}): Promise<Result<components['schemas']['FileDto'], FileError>> {
  try {
    const response = await fetch(
      `${process.env.NEW_DRIVE_URL}/files/${folderUuid}/meta`,
      {
        method: 'PATCH',
        headers: getNewApiHeaders(),
        body: JSON.stringify({
          plainName,
          type,
        }),
      }
    );
    if (response.ok) {
      const data: components['schemas']['FileDto'] = await response.json();
      return { data };
    }
    return errorHandler(response);
  } catch (error) {
    logger.error({
      msg: 'Error renaming file',
      error,
    });
    return {
      error: new FileError('UNKNOWN'),
    };
  }
}
