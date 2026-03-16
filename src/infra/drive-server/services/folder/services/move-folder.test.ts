import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

import { moveFolder } from './move-folder';

describe('move-folder', () => {
  const driveServerPatchMock = partialSpyOn(driveServerClient, 'PATCH');

  it('should call PATCH /folders/{uuid} with correct params', async () => {
    const folderData = { id: 1, uuid: 'folder-uuid' };
    driveServerPatchMock.mockResolvedValue({ data: folderData } as object);

    await moveFolder({ uuid: 'folder-uuid', destinationFolder: 'dest-uuid' });

    call(driveServerPatchMock).toMatchObject([
      '/folders/{uuid}',
      {
        path: { uuid: 'folder-uuid' },
        body: { destinationFolder: 'dest-uuid' },
      },
    ]);
  });

  it('should return data when the request is successful', async () => {
    const folderData = { id: 1, uuid: 'folder-uuid' };
    driveServerPatchMock.mockResolvedValue({ data: folderData } as object);

    const result = await moveFolder({ uuid: 'folder-uuid', destinationFolder: 'dest-uuid' });

    expect(result.data).toMatchObject(folderData);
    expect(result.error).toBe(undefined);
  });

  it('should log and return error when the request fails', async () => {
    const error = new DriveServerError('BAD_REQUEST', 400);
    driveServerPatchMock.mockResolvedValue({ data: undefined, error } as object);

    const result = await moveFolder({ uuid: 'folder-uuid', destinationFolder: 'dest-uuid' });

    expect(result.error).toBe(error);
  });
});
