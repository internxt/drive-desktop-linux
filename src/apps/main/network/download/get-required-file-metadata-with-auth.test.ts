import * as requestsModule from '../requests';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { getRequiredFileMetadataWithAuth } from './get-required-file-metadata-with-auth';

describe('get-required-file-metadata-with-auth', () => {
  const getFileInfoWithAuthMock = partialSpyOn(requestsModule, 'getFileInfoWithAuth');
  const getMirrorsMock = partialSpyOn(requestsModule, 'getMirrors');

  it('should return file metadata and mirrors for auth flow', async () => {
    // Given
    const fileMeta = { index: '0011', size: 10 };
    const mirrors = [{ url: 'https://mirror' }];
    getFileInfoWithAuthMock.mockResolvedValue(fileMeta);
    getMirrorsMock.mockResolvedValue(mirrors);

    // When
    const result = await getRequiredFileMetadataWithAuth({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      creds: { user: 'u', pass: 'p' },
    });

    // Then
    expect(result).toStrictEqual({ fileMeta, mirrors });
  });
});
