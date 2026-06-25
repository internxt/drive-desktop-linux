import { FileVersionOneError } from '@internxt/sdk/dist/network/download';
import { ReadableStream } from 'node:stream/web';
import * as downloadFileV1Module from './download-file-v1';
import * as downloadFileV2Module from './downloadv2';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { downloadFileWithVersionFallback } from './download-file-with-version-fallback';

describe('download-file-with-version-fallback', () => {
  const downloadFileV1Mock = partialSpyOn(downloadFileV1Module, 'downloadFileV1');
  const downloadFileV2Mock = partialSpyOn(downloadFileV2Module, 'default');

  it('should return v2 result when v2 succeeds', async () => {
    // Given
    const stream = new ReadableStream<Uint8Array>();
    downloadFileV2Mock.mockResolvedValue(stream);

    // When
    const result = await downloadFileWithVersionFallback({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      options: { notifyProgress: vi.fn() },
    });

    // Then
    expect(result).toBe(stream);
    expect(downloadFileV1Mock).toHaveBeenCalledTimes(0);
  });

  it('should fallback to v1 when v2 throws FileVersionOneError', async () => {
    // Given
    const stream = new ReadableStream<Uint8Array>();
    downloadFileV2Mock.mockRejectedValue(new FileVersionOneError());
    downloadFileV1Mock.mockResolvedValue(stream);

    // When
    const result = await downloadFileWithVersionFallback({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      options: { notifyProgress: vi.fn() },
    });

    // Then
    expect(result).toBe(stream);
    expect(downloadFileV1Mock).toHaveBeenCalledTimes(1);
  });

  it('should rethrow unknown errors from v2', async () => {
    // Given
    const error = new Error('boom');
    downloadFileV2Mock.mockRejectedValue(error);

    // Then
    await expect(
      downloadFileWithVersionFallback({
        networkApiUrl: 'https://api',
        bucketId: 'bucket-id',
        fileId: 'file-id',
        options: { notifyProgress: vi.fn() },
      }),
    ).rejects.toThrow('boom');
  });
});
