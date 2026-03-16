import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

import { getBackupFolderUuid } from './fetch-backup-folder-uuid';

describe('fetch-backup-folder-uuid', () => {
  const driveServerGetMock = partialSpyOn(driveServerClient, 'GET');

  it('should call GET /folders/{id}/metadata with correct params', async () => {
    const folderData = { uuid: 'folder-uuid' };
    driveServerGetMock.mockResolvedValue({ data: folderData } as object);

    await getBackupFolderUuid({ folderId: '123' });

    call(driveServerGetMock).toMatchObject([
      '/folders/{id}/metadata',
      {
        path: { id: '123' },
      },
    ]);
  });

  it('should return the folder uuid when the request is successful', async () => {
    const folderData = { uuid: 'folder-uuid' };
    driveServerGetMock.mockResolvedValue({ data: folderData } as object);

    const result = await getBackupFolderUuid({ folderId: '123' });

    expect(result.data).toBe('folder-uuid');
    expect(result.error).toBe(undefined);
  });

  it('should log and return error when the request fails', async () => {
    const error = new DriveServerError('BAD_REQUEST', 400);
    driveServerGetMock.mockResolvedValue({ data: undefined, error } as object);

    const result = await getBackupFolderUuid({ folderId: '123' });

    expect(result.error).toBe(error);
  });
});
