import { partialSpyOn } from 'tests/vitest/utils.helper';
import * as authServiceModule from '../../../../../apps/main/auth/service';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

import { deleteFileFromStorageByFileId } from './delete-file-content-from-bucket';

describe('deleteFileFromStorageByFileId', () => {
  const driveServerDeleteMock = partialSpyOn(driveServerClient, 'DELETE');
  const getNewApiHeadersMock = partialSpyOn(authServiceModule, 'getNewApiHeaders');

  beforeEach(() => {
    getNewApiHeadersMock.mockReturnValue({});
  });

  it('should return true when the request is successful', async () => {
    driveServerDeleteMock.mockResolvedValue({ data: {} } as object);

    const result = await deleteFileFromStorageByFileId({ bucketId: 'bucket-1', fileId: 'file-1' });

    expect(result.data).toBe(true);
    expect(result.error).toBe(undefined);
  });

  it('should log and return error when the request fails', async () => {
    const error = new DriveServerError('SERVER_ERROR', 500);
    driveServerDeleteMock.mockResolvedValue({ data: undefined, error } as object);

    const result = await deleteFileFromStorageByFileId({ bucketId: 'bucket-1', fileId: 'file-1' });

    expect(result.error).toBe(error);
  });
});
