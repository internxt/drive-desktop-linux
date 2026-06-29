import * as requestsModule from '../../../apps/main/network/requests';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { getRequiredFileMetadataWithToken } from './get-required-file-metadata-with-token';

describe('get-required-file-metadata-with-token', () => {
  const getFileInfoWithTokenMock = partialSpyOn(requestsModule, 'getFileInfoWithToken');
  const getMirrorsMock = partialSpyOn(requestsModule, 'getMirrors');

  it('should return file metadata and mirrors for token flow', async () => {
    // Given
    const fileMeta = { index: '0011', size: 10 };
    const mirrors = [{ url: 'https://mirror' }];
    getFileInfoWithTokenMock.mockResolvedValue(fileMeta);
    getMirrorsMock.mockResolvedValue(mirrors);

    // When
    const result = await getRequiredFileMetadataWithToken({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      token: 'token',
    });

    // Then
    expect(result).toStrictEqual({ fileMeta, mirrors });
  });
});
