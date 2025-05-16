import { driveServerClient } from '../../client/drive-server.client.instance';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { logger } from '../../../../core/LoggerService/LoggerService';
import { GetFoldersQuery } from './folders.types';
import { FoldersService } from './folders.service';
import { AddItemToTrashRequest } from '../services.types';
import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import { components } from '../../../schemas';

jest.mock('../../../../apps/main/auth/service', () => ({
  getNewApiHeaders: jest.fn(),
}));

jest.mock('../../client/drive-server.client.instance', () => ({
  driveServerClient: {
    GET: jest.fn(),
    PUT: jest.fn(),
    PATCH: jest.fn(),
    POST: jest.fn(),
    DELETE: jest.fn(),
  },
}));

jest.mock('../../../../core/LoggerService/LoggerService', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('FoldersService', () => {
  let sut: FoldersService;
  let mockedHeaders: Record<string, string>;

  beforeEach(() => {
    sut = new FoldersService();
    mockedHeaders = {
      Authorization: 'Bearer token',
      'content-type': 'application/json; charset=utf-8',
      'internxt-client': 'drive-desktop',
      'internxt-version': '2.4.8',
      'x-internxt-desktop-header': 'test-header',
    };
    (getNewApiHeaders as jest.Mock).mockReturnValue(mockedHeaders);
    jest.clearAllMocks();
  });

  describe('createFolder', () => {
    const body: components['schemas']['CreateFolderDto'] = {
      plainName: 'folder-name',
      parentFolderUuid: '79a88429-b45a-4ae7-90f1-c351b6882670',
    };
    it('should return the created folder when the request is successful', async () => {
      const response : components['schemas']['FolderDto'] = {} as unknown as components['schemas']['FolderDto'];

      (driveServerClient.POST as jest.Mock).mockResolvedValue({
        data: response,
      });
      const result = await sut.createFolder(body);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toEqual(response);
      expect(driveServerClient.POST).toHaveBeenCalledWith('/folders', {
        body,
        headers: mockedHeaders,
      });
    });
    it('should return an error when response is not successful', async () => {
      (driveServerClient.POST as jest.Mock).mockResolvedValue({
        data: undefined,
      });

      const result = await sut.createFolder(body);

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Create folder request was not successful');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Create folder request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders' },
        })
      );
    });
    it('should return an error when request throws an exception', async () => {
      const error = new Error('Network error');
      (driveServerClient.POST as jest.Mock).mockRejectedValue(error);

      const result = await sut.createFolder(body);

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toEqual(error);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Create folder request threw an exception',
          tag: 'FOLDERS',
          error,
          attributes: {
            endpoint: '/folders',
          },
        })
      );
    });
  });

  describe('getFolderMetadata', () => {

  });

  describe('getFolderContent', () => {});

  describe('getFolders', () => {
    const params: GetFoldersQuery = {
      limit: 10,
      offset: 0,
      status: 'EXISTS',
    };

    it('should return folders when response is successful', async () => {
      const mockFolders = [
        { id: '1', name: 'Folder A' },
        { id: '2', name: 'Folder B' },
      ];
      (driveServerClient.GET as jest.Mock).mockResolvedValue({
        data: mockFolders,
      });

      const result = await sut.getFolders(params);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toEqual(mockFolders);
      expect(driveServerClient.GET).toHaveBeenCalledWith('/folders', {
        headers: mockedHeaders,
        query: params,
      });
    });
    it('should return an error when response is not successful', async () => {
      (driveServerClient.GET as jest.Mock).mockResolvedValue({
        data: undefined,
      });

      const result = await sut.getFolders(params);

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Get folders request was not successful');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Get folders request was not successful',
          tag: 'FOLDERS',
          attributes: {
            endpoint: '/folders',
          },
        })
      );
    });
    it('should return an error when request throws an exception', async () => {
      const error = new Error('Network error');
      (driveServerClient.GET as jest.Mock).mockRejectedValue(error);

      const result = await sut.getFolders(params);

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toEqual(error);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Get folders request threw an exception',
          tag: 'FOLDERS',
          error,
          attributes: {
            endpoint: '/folders',
          },
        })
      );
    });
  });

  describe('getFolderTree', () => {
    const uuid = '6e7b823e-2adb-4c02-be2d-dfa65658b0cf';
    it('should return folders when response is successful', async () => {
      const data = {} as FolderTree;
      (driveServerClient.GET as jest.Mock).mockResolvedValue({
        data,
      });
      const result = await sut.getFolderTree(uuid);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toEqual(data);
      expect(driveServerClient.GET).toHaveBeenCalledWith(
        '/folders/{uuid}/tree',
        {
          path: { uuid },
          headers: mockedHeaders,
        }
      );
    });
    it('should return an error when response is not successful', async () => {
      (driveServerClient.GET as jest.Mock).mockResolvedValue({
        data: undefined,
      });
      const result = await sut.getFolderTree(uuid);

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Get folder tree request was not successful');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Get folder tree request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{uuid}/tree' },
        })
      );
    });
    it('should return an error when request throws an exception', async () => {
      const error = new Error('Network error');
      (driveServerClient.GET as jest.Mock).mockRejectedValue(error);

      const result = await sut.getFolderTree(uuid);

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toEqual(error);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Get folder tree request threw an exception',
          tag: 'FOLDERS',
          error,
          attributes: {
            endpoint: '/folders/{uuid}/tree',
          },
        })
      );
    });
  });

  describe('moveFolder', () => {
    const uuid = '911da5c3-d288-4b65-9c1e-8878b4038ba9';
    const destinationFolder = 'ac9a4ca4-0014-4345-ab21-4bcf1c2131e4';

    it('should return true when response is successful', async () => {
      (driveServerClient.PATCH as jest.Mock).mockResolvedValue({
        data: {} as unknown as any,
      });

      const response = await sut.moveFolder({
        uuid,
        destinationFolder,
      });
      expect(response.isRight()).toBe(true);
      expect(response.getRight()).toBe(true);
      expect(driveServerClient.PATCH).toHaveBeenCalledWith('/folders/{uuid}', {
        headers: mockedHeaders,
        path: { uuid },
        body: { destinationFolder },
      });
    });
    it('should return an error when response is not successful', async () => {
      (driveServerClient.PATCH as jest.Mock).mockResolvedValue({
        data: undefined,
      });

      const response = await sut.moveFolder({
        uuid,
        destinationFolder,
      });
      expect(response.isLeft()).toBe(true);
      const error = response.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Move folder request was not successful');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Move folder request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{uuid}' },
        })
      );
    });
    it('should return an error when request throws an exception', async () => {
      const error = new Error('Network error');
      (driveServerClient.PATCH as jest.Mock).mockRejectedValue(error);

      const response = await sut.moveFolder({
        uuid,
        destinationFolder,
      });
      expect(response.isLeft()).toBe(true);
      expect(response.getLeft()).toEqual(error);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Move folder request threw an exception',
          tag: 'FOLDERS',
          error,
          attributes: {
            endpoint: '/folders/{uuid}',
          },
        })
      );
    });
  });

  describe('renameFolder', () => {
    const uuid = 'folder-uuid';
    const plainName = 'new-name';

    it('should return true when response is successful', async () => {
      (driveServerClient.PUT as jest.Mock).mockResolvedValue({
        data: {} as unknown as any,
      });
      const result = await sut.renameFolder({ uuid, plainName });

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(true);
      expect(driveServerClient.PUT).toHaveBeenCalledWith(
        '/folders/{uuid}/meta',
        {
          path: { uuid },
          body: { plainName },
          headers: mockedHeaders,
        }
      );
    });

    it('should return an error when response is not successful', async () => {
      (driveServerClient.PUT as jest.Mock).mockResolvedValue({
        data: undefined,
      });
      const result = await sut.renameFolder({ uuid, plainName });

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Rename folder response was not successful');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Rename folder response was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{uuid}/meta' },
        })
      );
    });

    it('should return an error when request throws an exception', async () => {
      const thrownError = new Error('Network error');

      (driveServerClient.PUT as jest.Mock).mockRejectedValue(thrownError);
      const result = await sut.renameFolder({ uuid, plainName });

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toBeInstanceOf(Error);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Rename folder request threw an exception',
          tag: 'FOLDERS',
          error: thrownError,
          attributes: {
            endpoint: '/folders/{uuid}/meta',
          },
        })
      );
    });
  });

  describe('addFolderToTrash', () => {
    const request: AddItemToTrashRequest = {
      id: '1',
      uuid: 'folder-123',
      type: 'folder',
    };

    it('should return true when response is successful and the request is with uuid', async () => {
      const uuidOnlyRequest = {
        id: null,
        uuid: '36c7e2e0-a873-48ed-9eee-1bd64d53efeb',
        type: 'file',
      };

      (driveServerClient.POST as jest.Mock).mockResolvedValue({
        data: '', // this is the actual response
      });
      const headers = { Authorization: 'Bearer token' };
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const result = await sut.addFolderToTrash(uuidOnlyRequest);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(true);

      expect(driveServerClient.POST).toHaveBeenCalledWith(
        '/storage/trash/add',
        {
          body: {
            items: [{ uuid: uuidOnlyRequest.uuid, type: uuidOnlyRequest.type }],
          },
          headers,
        }
      );
    });

    it('should return true when response is successful and the request is with id', async () => {
      const idOnlyRequest = {
        id: '1',
        uuid: '',
        type: 'file',
      };

      (driveServerClient.POST as jest.Mock).mockResolvedValue({
        data: '', // this is the actual response
      });
      const headers = { Authorization: 'Bearer token' };
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);
      const result = await sut.addFolderToTrash(idOnlyRequest);
      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(true);

      expect(driveServerClient.POST).toHaveBeenCalledWith(
        '/storage/trash/add',
        {
          body: { items: [{ id: idOnlyRequest.id, type: idOnlyRequest.type }] },
          headers,
        }
      );
    });

    it('should return an error if neither uuid nor id is provided', async () => {
      const invalidRequest = {
        id: null,
        uuid: '',
        type: 'file',
      };

      const result = await sut.addFolderToTrash(invalidRequest);

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Either uuid or id must be provided');
    });

    it('should return an error when response is not successful', async () => {
      (driveServerClient.POST as jest.Mock).mockResolvedValue({
        data: {} as unknown as any,
      });
      const headers = { Authorization: 'Bearer token' };
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const result = await sut.addFolderToTrash(request);

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        'Response add folder to trash was not successful'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Response add folder to trash was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/storage/trash/add' },
        })
      );
    });

    it('should return an error when request throws an exception', async () => {
      const thrownError = new Error('Network failure');
      (driveServerClient.POST as jest.Mock).mockRejectedValue(thrownError);

      const result = await sut.addFolderToTrash(request);

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toEqual(thrownError);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Request add folder to trash threw an exception',
          tag: 'FOLDERS',
          error: thrownError,
          attributes: {
            endpoint: '/storage/trash/add',
          },
        })
      );
    });
  });

  describe('deleteFolder', () => {
    const uuid = 'folder-uuid';
    it('should return true when the request is successful', async () => {
      (driveServerClient.DELETE as jest.Mock).mockResolvedValue({
        data: {} as unknown as any,
      });
      const result = await sut.deleteFolder(uuid);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(true);
    });

    it('should return an error when the response is not successful', async () => {
      (driveServerClient.DELETE as jest.Mock).mockResolvedValue({
        data: undefined,
      });

      const result = await sut.deleteFolder(uuid);

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Delete folder request was not successful');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Delete folder request was not successful',
          tag: 'FOLDERS',
          attributes: { endpoint: '/folders/{uuid}' },
        })
      );
    });

    it('should return an error when the request throws an exception', async () => {
      const thrownError = new Error('Network failure');
      (driveServerClient.DELETE as jest.Mock).mockRejectedValue(thrownError);

      const result = await sut.deleteFolder(uuid);
      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toEqual(thrownError);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Delete folder request threw an exception',
          tag: 'FOLDERS',
          error: thrownError,
          attributes: {
            endpoint: '/folders/{uuid}',
          },
        })
      );
    });
  });
});
