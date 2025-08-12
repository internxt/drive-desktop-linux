import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import { Result } from '../../../../../context/shared/domain/Result';
import { components } from '../../../../../infra/schemas';
import fetch from 'electron-fetch';
import { getNewApiHeaders } from '../../../../../apps/main/auth/service';

export async function moveFolder(
  uuid: string,
  destinationFolderUuid: string
): Promise<Result<components['schemas']['FolderDto'], Error>> {
  try {
    const response = await fetch(
      `${process.env.NEW_DRIVE_URL}/folders/${uuid}`,
      {
        method: 'PATCH',
        headers: getNewApiHeaders(),
        body: JSON.stringify({
          destinationFolder: destinationFolderUuid,
        }),
      }
    );
    if (!response.ok) {
      return {
        error: logger.error({
          msg: 'Failed to move folder',
          error: response,
        }),
      };
    }
    const data: components['schemas']['FolderDto'] = await response.json();
    return { data };
  } catch (error) {
    const err = logger.error({
      msg: 'Error moving folder',
      error,
    });
    return { error: err };
  }
}
