import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import { Result } from '../../../../../context/shared/domain/Result';
import { components } from '../../../../../infra/schemas';
import fetch from 'electron-fetch';

export async function renameFolder(
  folderUuid: string,
  newFolderName: string
): Promise<Result<components['schemas']['FolderDto'], Error>> {
  try {
    const response = await fetch(
      `${process.env.NEW_DRIVE_URL}/folders/${folderUuid}/meta`,
      {
        method: 'PUT',
        body: JSON.stringify({
          plainName: newFolderName,
        }),
      }
    );
    if (!response.ok) {
      return {
        error: logger.error({
          msg: 'Failed to update folder name',
          error: response,
        }),
      };
    }
    const data: components['schemas']['FolderDto'] = await response.json();
    return { data };
  } catch (error) {
    const err = logger.error({
      msg: 'Error updating folder name',
      error,
    });
    return { error: err };
  }
}
