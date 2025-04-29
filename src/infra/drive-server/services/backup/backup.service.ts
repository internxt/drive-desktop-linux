import { driveServerClient } from '../../client/drive-server.client';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { Either, left, right } from '../../../../context/shared/domain/Either';
import { logger } from '../../../../core/LoggerService/LoggerService';
import { components } from '../../../schemas';

export class BackupService {
  async getDevices(): Promise<
    Either<Error, Array<components['schemas']['DeviceDto']>>
  > {
    try {
      const response = await driveServerClient.GET('/backup/deviceAsFolder', {
        headers: getNewApiHeaders(),
      });
      if (!response.data) {
        logger.error({
          msg: 'Get devices as folder request was not successful',
          tag: 'BACKUP',
          attributes: { endpoint: '/backup/deviceAsFolder' },
        });
        return left(new Error('Access request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({
        msg: 'Get devices as folder request request threw an exception',
        tag: 'BACKUP',
        error: error,
        attributes: {
          endpoint: '/backup/deviceAsFolder',
        },
      });
      return left(error);
    }
  }
}
