import * as getFileDownloadStreamModule from './get-file-download-stream';
import * as getRequiredFileMetadataModule from './get-required-file-metadata';
import * as resolveDownloadKeyModule from './resolve-download-key';
import * as streamModule from './stream';
import { ReadableStream } from 'node:stream/web';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { downloadFileV1 } from './download-file-v1';

describe('download-file-v1', () => {
  const buildProgressStreamMock = partialSpyOn(streamModule, 'buildProgressStream');
  const getFileDownloadStreamMock = partialSpyOn(getFileDownloadStreamModule, 'getFileDownloadStream');
  const getRequiredFileMetadataMock = partialSpyOn(getRequiredFileMetadataModule, 'getRequiredFileMetadata');
  const resolveDownloadKeyMock = partialSpyOn(resolveDownloadKeyModule, 'resolveDownloadKey');

  it('should build progress stream from downloaded encrypted data', async () => {
    // Given
    const metadata = {
      mirrors: [{ url: 'https://a' }, { url: 'https://b' }],
      fileMeta: { index: '00112233445566778899aabbccddeeff', size: 10 },
    };
    const encrypted = new ReadableStream<Uint8Array>();
    const progressed = new ReadableStream<Uint8Array>();

    getRequiredFileMetadataMock.mockResolvedValue(metadata);
    resolveDownloadKeyMock.mockResolvedValue(Buffer.alloc(32, 1));
    getFileDownloadStreamMock.mockResolvedValue(encrypted);
    buildProgressStreamMock.mockReturnValue(progressed);

    // When
    const result = await downloadFileV1({
      networkApiUrl: 'https://api',
      bucketId: 'bucket-id',
      fileId: 'file-id',
      options: { notifyProgress: vi.fn() },
      mnemonic: 'mnemonic',
    });

    // Then
    expect(getRequiredFileMetadataMock).toHaveBeenCalledTimes(1);
    expect(resolveDownloadKeyMock).toHaveBeenCalledTimes(1);
    expect(getFileDownloadStreamMock).toHaveBeenCalledTimes(1);
    expect(buildProgressStreamMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(progressed);
  });
});
