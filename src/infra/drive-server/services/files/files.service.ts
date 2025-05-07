import { mapError } from '../utils/mapError';
import { logger } from '../../../../core/LoggerService/LoggerService';
import { Either, left, right } from '../../../../context/shared/domain/Either';
import { driveServerClient } from '../../client/drive-server.client.instance';
import { components } from '../../../schemas';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { GetFilesQuery, MoveFileParams } from './files.types';

export class FilesService {
  async getFiles(
    params: GetFilesQuery
  ): Promise<Either<Error, Array<components['schemas']['FileDto']>>> {
    try {
      const response = await driveServerClient.GET('/files', {
        headers: getNewApiHeaders(),
        query: { ...params },
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

  async moveFile( params: MoveFileParams ): Promise<Either<Error, boolean>> {
    try {
      const response = await driveServerClient.PATCH('/files/{uuid}', {
        path: { uuid: params.uuid },
        body: { parentUuid: params.parentUuid },
        headers: getNewApiHeaders(),
      });

      if (typeof response.data !== 'undefined') {
        logger.error({
          msg: 'Move file response contained unexpected data',
          tag: 'FILES',
          attributes: { endpoint: '/files/{uuid}' },
        });
        return left(new Error('Move file response contained unexpected data'));
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Move file request threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/files/{uuid}',
        },
      });
      return left(error);
    }
  }
}
