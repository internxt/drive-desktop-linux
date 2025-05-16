import { Either, left, right } from '../../../../context/shared/domain/Either';
import { driveServerClient } from '../../client/drive-server.client.instance';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { logger } from '../../../../core/LoggerService/LoggerService';
import { mapError } from '../utils/mapError';
import { CreateFolderBodyRequest, GetFoldersQuery, MoveFolderRequest, RenameFolderParams } from './folders.types';
import { components } from '../../../schemas';
import { AddItemToTrashRequest, TrashItemPayload } from '../services.types';
import { mapToTrashPayload } from '../utils/mapToTrashPayload';
import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';

export class FoldersService {

  async createFolder(body: CreateFolderBodyRequest): Promise<Either<Error,components['schemas']['FolderDto']>> {
    try {
      const response = await driveServerClient.POST('/folders', {
        body,
        headers: getNewApiHeaders(),
      });
      if (!response.data) {
        logger.error({
          msg: 'Create folder request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders' },
        });
        return left(new Error('Create folder request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Create folder request threw an exception',
        tag: 'FOLDERS',
        error: error,
        attributes: {
          endpoint: '/folders',
        },
      });
      return left(error);
    }
  }

  async getFolderMetadata(folderId: string): Promise<Either<Error, components['schemas']['FolderDto']>> {
    try {
      const response = await driveServerClient.GET('/folders/{id}/metadata', {
        path: { id: folderId },
        headers: getNewApiHeaders(),
      });
      if (!response.data) {
        logger.error({
          msg: 'Get folder metadata request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{id}/metadata' },
        });
        return left(new Error('Get folder metadata request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Get folder metadata request threw an exception',
        tag: 'FOLDERS',
        error: error,
        attributes: {
          endpoint: '/folders/{id}/metadata',
        },
      });
      return left(error);
    }
  }

  async getFolderContent(uuid: string): Promise<Either<Error, components['schemas']['GetFolderContentDto']>> {
    try {
      const response = await driveServerClient.GET('/folders/content/{uuid}', {
        path: { uuid },
        headers: getNewApiHeaders(),
      });
      if (!response.data) {
        logger.error({
          msg: 'Get folder content request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/content/{uuid}' },
        });
        return left(new Error('Get folder content request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Get folder content request threw an exception',
        tag: 'FOLDERS',
        error: error,
        attributes: {
          endpoint: '/folders/content/{uuid}',
        },
      });
      return left(error);
    }
  }

  async getFolders(
    params: GetFoldersQuery
  ): Promise<Either<Error, Array<components['schemas']['FolderDto']>>> {
    try {
      const response = await driveServerClient.GET('/folders', {
        headers: getNewApiHeaders(),
        query: { ...params },
      });
      if (!response.data) {
        logger.error({
          msg: 'Get folders request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders' },
        });
        return left(new Error('Get folders request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Get folders request threw an exception',
        tag: 'FOLDERS',
        error: error,
        attributes: {
          endpoint: '/folders',
        },
      });
      return left(error);
    }
  }

  async getFolderTree(uuid: string): Promise<Either<Error, FolderTree>> {
   try {
     const response = await driveServerClient.GET('/folders/{uuid}/tree', {
       path: { uuid },
       headers: getNewApiHeaders(),
     });
      if (!response.data) {
        logger.error({
          msg: 'Get folder tree request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{uuid}/tree' },
        });
        return left(new Error('Get folder tree request was not successful'));
      }
      return right(response.data);
   } catch (err) {
     const error = mapError(err);
     logger.error({
       msg: 'Get folder tree request threw an exception',
       tag: 'FOLDERS',
       error: error,
       attributes: {
         endpoint: '/folders/{uuid}/tree',
       },
     });
     return left(error);
   }
  }

  async moveFolder (body: MoveFolderRequest): Promise<Either<Error, boolean>> {
    try {
      const response = await driveServerClient.PATCH('/folders/{uuid}', {
        path: { uuid: body.uuid },
        body: {
          destinationFolder: body.destinationFolder
        },
        headers: getNewApiHeaders(),
      });

      if (!response.data) {
        logger.error({
          msg: 'Move folder request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{uuid}' },
        });
        return left(new Error('Move folder request was not successful'));
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Move folder request threw an exception',
        tag: 'FOLDERS',
        error: error,
        attributes: {
          endpoint: '/folders/{uuid}',
        },
      });
      return left(error);
    }
  }

  async renameFolder(
    params: RenameFolderParams
  ): Promise<Either<Error, boolean>> {
    try {
      /* even though in path says that /folders/{uuid}/meta does not return anything, it does */
      const response = await driveServerClient.PUT('/folders/{uuid}/meta', {
        path: { uuid: params.uuid },
        body: { plainName: params.plainName },
        headers: getNewApiHeaders(),
      });
      if (!response.data) {
        logger.error({
          msg: 'Rename folder response was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{uuid}/meta' },
        });
        return left(new Error('Rename folder response was not successful'));
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Rename folder request threw an exception',
        tag: 'FOLDERS',
        error: error,
        attributes: {
          endpoint: '/folders/{uuid}/meta',
        },
      });
      return left(error);
    }
  }

  async addFolderToTrash(
    item: AddItemToTrashRequest
  ): Promise<Either<Error, boolean>> {
    try {
      const payloadItem: TrashItemPayload | undefined = mapToTrashPayload(item);

      if (!payloadItem) {
        return left(new Error('Either uuid or id must be provided'));
      }

      /* even though in path says that /storage/trash/add does not return anything, it does */
      const response = await driveServerClient.POST('/storage/trash/add', {
        body: {
          items: [payloadItem],
        },
        headers: getNewApiHeaders(),
      });
      if (response.data !== undefined && response.data !== '') {
        logger.error({
          msg: 'Response add folder to trash was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/storage/trash/add' },
        });
        return left(
          new Error('Response add folder to trash was not successful')
        );
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Request add folder to trash threw an exception',
        tag: 'FOLDERS',
        error: error,
        attributes: {
          endpoint: '/storage/trash/add',
        },
      });
      return left(error);
    }
  }

  async deleteFolder(uuid: string): Promise<Either<Error, boolean>> {
    try {
      const response = await driveServerClient.DELETE('/folders/{uuid}', {
        path: { uuid },
        headers: getNewApiHeaders(),
      });
      if (!response.data) {
        logger.error({
          msg: 'Delete folder request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{uuid}' },
        });
        return left(new Error('Delete folder request was not successful'));
      }
      return right(true);
    } catch (err) {
      const error = mapError(err);
      logger.error({
        msg: 'Delete folder request threw an exception',
        tag: 'FOLDERS',
        error: error,
        attributes: {
          endpoint: '/folders/{uuid}',
        },
      });
      return left(error);
    }
  }
}
