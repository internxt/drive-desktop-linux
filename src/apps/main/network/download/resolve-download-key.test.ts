import { GenerateFileKey } from '@internxt/inxt-js/build/lib/utils/crypto';
import { deepMocked } from 'tests/vitest/utils.helper';
vi.mock(import('@internxt/inxt-js/build/lib/utils/crypto'));
import { resolveDownloadKey } from './resolve-download-key';

describe('resolve-download-key', () => {
  const generateFileKeyMock = deepMocked(GenerateFileKey);

  it('should return encryption key when provided', async () => {
    // Given
    const encryptionKey = Buffer.from('abc');

    // When
    const result = await resolveDownloadKey({
      encryptionKey,
      bucketId: 'bucket-id',
      index: Buffer.from('0011', 'hex'),
    });

    // Then
    expect(result).toBe(encryptionKey);
  });

  it('should generate key from mnemonic when encryption key is not provided', async () => {
    // Given
    const generatedKey = Buffer.from('key');
    generateFileKeyMock.mockResolvedValue(generatedKey);

    // When
    const result = await resolveDownloadKey({
      mnemonic: 'mnemonic',
      bucketId: 'bucket-id',
      index: Buffer.from('0011', 'hex'),
    });

    // Then
    expect(result).toBe(generatedKey);
    expect(generateFileKeyMock).toHaveBeenCalledTimes(1);
  });

  it('should throw when no source for key is provided', async () => {
    // Then
    await expect(
      resolveDownloadKey({
        bucketId: 'bucket-id',
        index: Buffer.from('0011', 'hex'),
      }),
    ).rejects.toThrow('Download error code 1');
  });
});
