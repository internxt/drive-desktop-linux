import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

import { searchFolder } from './search-folder';

describe('search-folder', () => {
  const driveServerGetMock = partialSpyOn(driveServerClient, 'GET');
  const parentFolderUuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

  it('should call GET /folders/content/{uuid}/folders with correct params', async () => {
    driveServerGetMock.mockResolvedValue({ data: { folders: [] } } as object);

    await searchFolder({ parentFolderUuid, offset: 0, limit: 50 });

    call(driveServerGetMock).toMatchObject([
      '/folders/content/{uuid}/folders',
      {
        path: { uuid: parentFolderUuid },
        query: { offset: 0, limit: 50 },
      },
    ]);
  });

  it('should use default limit of 50', async () => {
    driveServerGetMock.mockResolvedValue({ data: { folders: [] } } as object);

    await searchFolder({ parentFolderUuid, offset: 0 });

    call(driveServerGetMock).toMatchObject([
      '/folders/content/{uuid}/folders',
      {
        query: { offset: 0, limit: 50 },
      },
    ]);
  });

  it('should return the folders array when the request is successful', async () => {
    const folders = [{ id: 1, uuid: 'folder-uuid', plainName: 'test' }];
    driveServerGetMock.mockResolvedValue({ data: { folders } } as object);

    const result = await searchFolder({ parentFolderUuid, offset: 0 });

    expect(result.data).toMatchObject(folders);
    expect(result.error).toBe(undefined);
  });

  it('should log and return error when the request fails', async () => {
    const error = new DriveServerError('BAD_REQUEST', 400);
    driveServerGetMock.mockResolvedValue({ data: undefined, error } as object);

    const result = await searchFolder({ parentFolderUuid, offset: 0 });

    expect(result.error).toBe(error);
  });
});
