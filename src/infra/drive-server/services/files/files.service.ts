import { mapError } from '../utils/mapError';
import { logger } from '../../../../core/LoggerService/LoggerService';
import { Either, left, right } from '../../../../context/shared/domain/Either';
import { driveServerClient } from '../../client/drive-server.client.instance';
import { components } from '../../../schemas';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { GetFilesQuery } from './files.types';

export class FilesService {
  async getFiles( params: GetFilesQuery ): Promise<Either<Error, Array<components['schemas']['FileDto']>>> {
    try {
      const response = await driveServerClient.GET('/files', {
        headers: getNewApiHeaders(),
        query: {...params}
      });
      if (!response.data) {
        logger.error({
          msg: 'Get files request was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/files' },
        });
        return left(new Error('Get files request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Get files request threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/files',
        },
      });
      return left(error);
    }
  }
}
