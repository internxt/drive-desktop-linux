import { BackupError } from '../../../../../apps/backups/BackupError';
import { Result } from '../../../../../context/shared/domain/Result';
import { components } from '../../../../schemas';
import { getNewApiHeaders } from '../../../../../apps/main/auth/service';
import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';

export async function createBackupFolder(
  deviceUuid: string,
  plainName: string
): Promise<Result<components['schemas']['FolderDto'], BackupError>> {
  try {
    const response = await fetch('/folders', {
      method: 'POST',
      headers: getNewApiHeaders(),
      body: JSON.stringify({
        parentFolderUuid: deviceUuid,
        plainName,
      }),
    });
    if (response.ok) {
      const data: components['schemas']['FolderDto'] = await response.json();
      return { data };
    }
    if (response.status === 409) {
      return {
        error: new BackupError('FOLDER_ALREADY_EXISTS'),
      };
    }
    if (response.status >= 500) {
      return {
        error: new BackupError('SERVER_ERROR'),
      };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        error: new BackupError('NO_PERMISSION'),
      };
    }
    if (response.status >= 400) {
      return {
        error: new BackupError('BAD_RESPONSE'),
      };
    }
    return { error: new BackupError('UNKNOWN') };
  } catch (error) {
    logger.error({
      tag: 'BACKUPS',
      msg: 'error posting a backup',
      error,
    });
    return {
      error: new BackupError('UNKNOWN'),
    };
  }
}
