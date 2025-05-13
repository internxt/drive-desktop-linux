import { mapError } from '../utils/mapError';
import { logger } from '../../../../core/LoggerService/LoggerService';
import { Either, left, right } from '../../../../context/shared/domain/Either';
import { driveServerClient } from '../../client/drive-server.client.instance';
import { components } from '../../../schemas';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import {
  AddFileToTrashRequest, CreateFileBodyRequest,
  CreateThumbnailBodyRequest,
  DeleteFileContentFromBucketRequest,
  GetFilesQuery,
  MoveFileParams,
  RenameFileParams,
  ReplaceFileParams, TrashItemPayload
} from './files.types';

export class FilesService {

  async createFile(body: CreateFileBodyRequest): Promise<Either<Error, components['schemas']['FileDto']>> {
    try {
      const response = await driveServerClient.POST('/files', {
        body,
        headers: getNewApiHeaders()
      });
      if (!response.data) {
        logger.error({
          msg: 'Create file request was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/files' }
        });
        return left(new Error('Create file request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Create file request threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/files'
        }
      });
      return left(error);
    }
  }

  async getFiles(
    params: GetFilesQuery
  ): Promise<Either<Error, Array<components['schemas']['FileDto']>>> {
    try {
      const response = await driveServerClient.GET('/files', {
        headers: getNewApiHeaders(),
        query: { ...params }
      });
      if (!response.data) {
        logger.error({
          msg: 'Get files request was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/files' }
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
          endpoint: '/files'
        }
      });
      return left(error);
    }
  }

  async moveFile(params: MoveFileParams): Promise<Either<Error, boolean>> {
    try {
      /* even though in path says that /files/{uuid} does not return anything, it does */
      const response = await driveServerClient.PATCH('/files/{uuid}', {
        path: { uuid: params.uuid },
        body: { destinationFolder: params.parentUuid },
        headers: getNewApiHeaders()
      });

      if (!response.data) {
        logger.error({
          msg: 'Move file response was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/files/{uuid}' }
        });
        return left(new Error('Move file response was not successful'));
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Move file request threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/files/{uuid}'
        }
      });
      return left(error);
    }
  }

  async renameFile(params: RenameFileParams): Promise<Either<Error, boolean>> {
    try {
      /* even though in path says that /files/{uuid}/meta does not return anything, it does */
      const response = await driveServerClient.PUT('/files/{uuid}/meta', {
        path: { uuid: params.uuid },
        body: { plainName: params.plainName, type: params.type },
        headers: getNewApiHeaders()
      });

      if (!response.data) {
        logger.error({
          msg: 'Rename file response was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/files/{uuid}/meta' }
        });
        return left(
          new Error('Rename file response was not successful')
        );
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Rename file request threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/files/{uuid}/meta'
        }
      });
      return left(error);
    }
  }

  async replaceFile(
    params: ReplaceFileParams
  ): Promise<Either<Error, boolean>> {
    try {
      /* even though in path says that /files/{uuid} does not return anything, it does */
      const response = await driveServerClient.PUT('/files/{uuid}', {
        path: { uuid: params.uuid },
        body: { fileId: params.fileId, size: params.size },
        headers: getNewApiHeaders()
      });

      if (!response.data) {
        logger.error({
          msg: 'Replace file response was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/files/{uuid}' }
        });
        return left(
          new Error('Replace file response was not successful')
        );
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Replace file request threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/files/{uuid}'
        }
      });
      return left(error);
    }
  }

  async createThumbnail(
    body: CreateThumbnailBodyRequest
  ): Promise<Either<Error, components['schemas']['ThumbnailDto']>> {
    try {
      const response = await driveServerClient.POST('/files/thumbnail', {
        body,
        headers: getNewApiHeaders()
      });
      if (!response.data) {
        logger.error({
          msg: 'Create thumbnail request was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/files/thumbnail' }
        });
        return left(new Error('Create thumbnail request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Create thumbnail request threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/files/thumbnail'
        }
      });
      return left(error);
    }
  }

  async deleteContentFromBucket(
    params: DeleteFileContentFromBucketRequest
  ): Promise<Either<Error, boolean>> {
    try {
      const response = await driveServerClient.DELETE(
        '/files/{bucketId}/{fileId}',
        {
          path: { bucketId: params.bucketId, fileId: params.fileId },
          headers: getNewApiHeaders()
        }
      );
      if (typeof response.data !== 'undefined') {
        logger.error({
          msg: 'Response delete file content from bucket contained unexpected data',
          tag: 'FILES',
          attributes: { endpoint: '/files/{bucketId}/{fileId}' }
        });
        return left(
          new Error(
            'Response delete file content from bucket contained unexpected data'
          )
        );
      }
      return right(true);
    } catch (e) {
      const error = mapError(e);
      logger.error({
        msg: 'Request delete file content from bucket threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/files/{bucketId}/{fileId}'
        }
      });
      return left(error);
    }
  }

  async addFileToTrash(item: AddFileToTrashRequest): Promise<Either<Error, boolean>> {
    try {
      const { uuid, id, type } = item;
      const payloadItem: TrashItemPayload = uuid
        ? { uuid, type }
        : { id: Number(id), type };

      /* even though in path says that /storage/trash/add does not return anything, it does */
      const response = await driveServerClient.POST('/storage/trash/add', {
        body: {
          items: [payloadItem]
        },
        headers: getNewApiHeaders(),
      });
      if (response.data !== undefined && response.data !== '') {
        logger.error({
          msg: 'Response add file to trash was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/storage/trash/add' }
        });
        return left(new Error('Response add file to trash was not successful'));
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Request add file to trash threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/storage/trash/add'
        }
      });
      return left(error);
    }
  }

  async deleteFileFromTrash(
    contentsId: string
  ): Promise<Either<Error, boolean>> {
    try {
      /* even though in path says that /storage/trash/file/{fileId} does not return anything, it does */
      const response = await driveServerClient.DELETE(
        '/storage/trash/file/{fileId}',
        {
          path: { fileId: contentsId },
          headers: getNewApiHeaders()
        },
      );
      if (response.data !== undefined && response.data !== '') {
        logger.error({
          msg: 'Response delete file from trash was not successful',
          tag: 'FILES',
          attributes: { endpoint: '/storage/trash/file/{fileId}' }
        });
        return left(
          new Error('Response delete file from trash was not successful')
        );
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Request delete file from trash threw an exception',
        tag: 'FILES',
        error: error,
        attributes: {
          endpoint: '/storage/trash/file/{fileId}'
        }
      });
      return left(error);
    }
  }
}
