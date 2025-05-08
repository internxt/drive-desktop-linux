import { FilesService } from './files.service';
import { GetFilesQuery } from './files.types';
import { components } from '../../../schemas';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { driveServerClient } from '../../client/drive-server.client.instance';
import { logger } from '../../../../core/LoggerService/LoggerService';

jest.mock('../../../../apps/main/auth/service', () => ({
  getNewApiHeaders: jest.fn(),
}));

jest.mock('../../client/drive-server.client.instance', () => ({
  driveServerClient: {
    GET: jest.fn(),
    PUT: jest.fn(),
    PATCH: jest.fn(),
    POST: jest.fn(),
  },
}));

jest.mock('../../../../core/LoggerService/LoggerService', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('FilesService', () => {
  let sut: FilesService;
  let mockedHeaders: Record<string, string>;

  beforeEach(() => {
    sut = new FilesService();
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

  describe('getFiles', () => {
    const mockedParams: GetFilesQuery = {
      limit: 10,
      offset: 0,
      status: 'EXISTS',
      bucket: 'bucket-id',
      sort: 'name',
      order: 'asc',
      updatedAt: '2023-01-01',
    };

    it('should return the files when response is successful', async () => {
      const files: components['schemas']['FileDto'][] = [
        { id: 'file-1', name: 'test.txt' } as any,
        { id: 'file-2', name: 'image.png' } as any,
      ];
      (driveServerClient.GET as jest.Mock).mockResolvedValue({ data: files });

      const result = await sut.getFiles(mockedParams);

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toEqual(files);
      expect(driveServerClient.GET).toHaveBeenCalledWith('/files', {
        headers: mockedHeaders,
        query: mockedParams,
      });
    });

    it('should return an error when response is not successful', async () => {
      (driveServerClient.GET as jest.Mock).mockResolvedValue({
        data: undefined,
      });

      const result = await sut.getFiles(mockedParams);

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Get files request was not successful');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Get files request was not successful',
          tag: 'FILES',
          attributes: {
            endpoint: '/files',
          },
        })
      );
    });

    it('should return an error when request throws an exception', async () => {
      const error = new Error('Network error');
      (driveServerClient.GET as jest.Mock).mockRejectedValue(error);

      const result = await sut.getFiles(mockedParams);

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toEqual(error);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Get files request threw an exception',
          tag: 'FILES',
          error,
          attributes: {
            endpoint: '/files',
          },
        })
      );
    });
  });

  describe('moveFile', () => {
    it('should return true when response is successful', async () => {
      const uuid = 'file-123';
      const parentUuid = 'folder-456';
      const headers = { Authorization: 'Bearer token' };

      (driveServerClient.PATCH as jest.Mock).mockResolvedValue({
        data: undefined,
      });
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const sut = new FilesService();
      const result = await sut.moveFile({ uuid, parentUuid });

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(true);

      expect(driveServerClient.PATCH).toHaveBeenCalledWith('/files/{uuid}', {
        path: { uuid },
        body: { parentUuid },
        headers,
      });
    });
    it('should return an error when response is not successful (unexpected data)', async () => {
      const uuid = 'file-123';
      const parentUuid = 'folder-456';
      const headers = { Authorization: 'Bearer token' };

      (driveServerClient.PATCH as jest.Mock).mockResolvedValue({
        data: { unexpected: true },
      });
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const sut = new FilesService();
      const result = await sut.moveFile({ uuid, parentUuid });

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        'Move file response contained unexpected data'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Move file response contained unexpected data',
          tag: 'FILES',
          attributes: { endpoint: '/files/{uuid}' },
        })
      );
    });
    it('should return an error when request throws an exception', async () => {
      const uuid = 'file-123';
      const parentUuid = 'folder-456';
      const headers = { Authorization: 'Bearer token' };
      const thrownError = new Error('Request failed');

      (driveServerClient.PATCH as jest.Mock).mockRejectedValue(thrownError);
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const sut = new FilesService();
      const result = await sut.moveFile({ uuid, parentUuid });

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Move file request threw an exception',
          tag: 'FILES',
          error: thrownError,
          attributes: {
            endpoint: '/files/{uuid}',
          },
        })
      );
    });
  });

  describe('renameFile', () => {
    it('should return true when response is successful', async () => {
      const uuid = 'file-uuid';
      const plainName = 'new-name.txt';
      const type = 'text/plain';
      const headers = { Authorization: 'Bearer token' };

      (driveServerClient.PUT as jest.Mock).mockResolvedValue({
        data: undefined,
      });
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const result = await sut.renameFile({ uuid, plainName, type });

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(true);

      expect(driveServerClient.PUT).toHaveBeenCalledWith('/files/{uuid}/meta', {
        path: { uuid },
        body: { plainName, type },
        headers,
      });
    });
    it('should return an error when response is not successful (unexpected data)', async () => {
      const uuid = 'file-uuid';
      const plainName = 'new-name.txt';
      const type = 'text/plain';
      const headers = { Authorization: 'Bearer token' };

      (driveServerClient.PUT as jest.Mock).mockResolvedValue({
        data: { unexpected: true },
      });
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const result = await sut.renameFile({ uuid, plainName, type });

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        'Rename file response contained unexpected data'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Rename file response contained unexpected data',
          tag: 'FILES',
          attributes: { endpoint: '/files/{uuid}/meta' },
        })
      );
    });
    it('should return an error when request throws an exception', async () => {
      const uuid = 'file-uuid';
      const plainName = 'new-name.txt';
      const type = 'text/plain';
      const headers = { Authorization: 'Bearer token' };
      const thrownError = new Error('Network error');

      (driveServerClient.PUT as jest.Mock).mockRejectedValue(thrownError);
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const result = await sut.renameFile({ uuid, plainName, type });

      expect(result.isLeft()).toBe(true);
      expect(result.getLeft()).toBeInstanceOf(Error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Rename file request threw an exception',
          tag: 'FILES',
          error: thrownError,
          attributes: {
            endpoint: '/files/{uuid}/meta',
          },
        })
      );
    });
  });

  describe('replaceFile', () => {
    it('should return true when response is successful', async () => {
      const uuid = 'file-uuid';
      const fileId = 'new-file-id';
      const size = 123456;
      const headers = { Authorization: 'Bearer token' };
      (driveServerClient.PUT as jest.Mock).mockResolvedValue({
        data: undefined,
      });
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);
      const result = await sut.replaceFile({ uuid, fileId, size });

      expect(result.isRight()).toBe(true);
      expect(result.getRight()).toBe(true);

      expect(driveServerClient.PUT).toHaveBeenCalledWith('/files/{uuid}', {
        path: { uuid },
        body: { fileId, size },
        headers,
      });
    });
    it('should return an error when response is not successful (unexpected data)', async () => {
      const uuid = 'file-uuid';
      const fileId = 'new-file-id';
      const size = 123456;
      const headers = { Authorization: 'Bearer token' };
      (driveServerClient.PUT as jest.Mock).mockResolvedValue({
        data: { something: 'unexpected' },
      });
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const result = await sut.replaceFile({ uuid, fileId, size });
      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        'Replace file response contained unexpected data'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Replace file response contained unexpected data',
          tag: 'FILES',
          attributes: { endpoint: '/files/{uuid}' },
        })
      );
    });
    it('should return an error when request throws an exception', async () => {
      const uuid = 'file-uuid';
      const fileId = 'new-file-id';
      const size = 123456;
      const thrownError = new Error('Network failure');
      const headers = { Authorization: 'Bearer token' };

      (driveServerClient.PUT as jest.Mock).mockRejectedValue(thrownError);
      (getNewApiHeaders as jest.Mock).mockReturnValue(headers);

      const result = await sut.replaceFile({ uuid, fileId, size });

      expect(result.isLeft()).toBe(true);
      const error = result.getLeft();
      expect(error).toBeInstanceOf(Error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Replace file request threw an exception',
          tag: 'FILES',
          error: thrownError,
          attributes: { endpoint: '/files/{uuid}' },
        })
      );
    });

    describe('createThumbnail', () => {
      const requestBody: components['schemas']['CreateThumbnailDto'] = {
        fileId: 1,
        type: 'text',
        size: 12345,
        maxWidth: 123456789,
        maxHeight: 123456789,
        bucketId: 'bucket-id',
        bucketFile: 'my-bucket',
        encryptVersion: '03-aes',
      };

      const thumbnail: components['schemas']['ThumbnailDto'] = {
        id: 2,
        fileId: 12345,
        maxWidth: 123456789,
        maxHeight: 123456789,
        type: 'text',
        size: 12345,
        bucketId: 'bucket-id',
        bucketFile: 'my-bucket',
        encryptVersion: '03-aes',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      it('should return the thumbnail when response is successful', async () => {
        (driveServerClient.POST as jest.Mock).mockResolvedValue({
          data: thumbnail,
        });

        const result = await sut.createThumbnail(requestBody);

        expect(result.isRight()).toBe(true);
        expect(result.getRight()).toEqual(thumbnail);

        expect(driveServerClient.POST).toHaveBeenCalledWith(
          '/files/thumbnail',
          {
            body: requestBody,
            headers: mockedHeaders,
          }
        );
      });
      it('should return an error when response is not successful', async () => {
        (driveServerClient.POST as jest.Mock).mockResolvedValue({
          data: undefined,
        });

        const result = await sut.createThumbnail(requestBody);

        expect(result.isLeft()).toBe(true);
        const error = result.getLeft();
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
          'Create thumbnail request was not successful'
        );

        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            msg: 'Create thumbnail request was not successful',
            tag: 'FILES',
            attributes: {
              endpoint: '/files/thumbnail',
            },
          })
        );
      });
      it('should return an error when request throws an exception', async () => {
        const thrownError = new Error('Request failed');
        (driveServerClient.POST as jest.Mock).mockRejectedValue(thrownError);

        const result = await sut.createThumbnail(requestBody);

        expect(result.isLeft()).toBe(true);
        expect(result.getLeft()).toBe(thrownError);

        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            msg: 'Create thumbnail request threw an exception',
            tag: 'FILES',
            error: thrownError,
            attributes: {
              endpoint: '/files/thumbnail',
            },
          })
        );
      });
    });
  });
});
