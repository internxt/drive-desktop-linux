import * as withAuthModule from './get-required-file-metadata-with-auth';
import * as withTokenModule from './get-required-file-metadata-with-token';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { getRequiredFileMetadata } from './get-required-file-metadata';

describe('get-required-file-metadata', () => {
  const withAuthMock = partialSpyOn(withAuthModule, 'getRequiredFileMetadataWithAuth');
  const withTokenMock = partialSpyOn(withTokenModule, 'getRequiredFileMetadataWithToken');

  it('should use auth flow when creds are provided', async () => {
    // Given
    const metadata = { fileMeta: { index: '0011', size: 10 }, mirrors: [] };
    withAuthMock.mockResolvedValue(metadata);

    // When
    const result = await getRequiredFileMetadata({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      creds: { user: 'u', pass: 'p' },
    });

    // Then
    expect(result).toStrictEqual(metadata);
  });

  it('should use token flow when token is provided', async () => {
    // Given
    const metadata = { fileMeta: { index: '0011', size: 10 }, mirrors: [] };
    withTokenMock.mockResolvedValue(metadata);

    // When
    const result = await getRequiredFileMetadata({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      token: 'token',
    });

    // Then
    expect(result).toStrictEqual(metadata);
  });

  it('should throw when neither creds nor token are provided', async () => {
    // Then
    await expect(
      getRequiredFileMetadata({
        networkApiUrl: 'https://api',
        bucketId: 'bucket-id',
        fileId: 'file-id',
      }),
    ).rejects.toThrow('Download error 1');
  });
});
