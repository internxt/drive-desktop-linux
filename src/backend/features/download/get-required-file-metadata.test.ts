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
    expect(result).toStrictEqual({ data: metadata });
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
    expect(result).toStrictEqual({ data: metadata });
  });

  it('should return error when neither creds nor token are provided', async () => {
    // When
    const result = await getRequiredFileMetadata({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
    });

    // Then
    expect(result.error).toBeInstanceOf(Error);
    expect(result).toStrictEqual({
      error: new Error('Could not retrieve file metadata: Either creds or token must be provided'),
    });
  });
});
