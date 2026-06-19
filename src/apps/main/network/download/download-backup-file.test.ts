import * as fsModule from 'node:fs';
import * as fsPromisesModule from 'node:fs/promises';
import * as transientErrorHandlerModule from '../../../../backend/common/rate-limit/transient-error-handler';
import * as retryWithBackoffModule from '../../../../shared/retry-with-backoff';
import * as networkFacadeModule from '../NetworkFacade';
import * as downloadFileModule from './download-file';
import * as streamModule from './stream';
import type { FlatFolderZip } from '../zip.service';
import { ReadableStream } from 'node:stream/web';
import { mockDeep } from 'vitest-mock-extended';
import { deepMocked, partialSpyOn } from 'tests/vitest/utils.helper';
vi.mock(import('node:fs'));
vi.mock(import('node:fs/promises'));
import { addBackupFileToZip } from './download-backup-file';

describe('download-backup-file', () => {
  const createReadStreamMock = deepMocked(fsModule.createReadStream);
  const rmMock = deepMocked(fsPromisesModule.rm);
  const convertToReadableStreamMock = partialSpyOn(networkFacadeModule, 'convertToReadableStream');
  const createTransientErrorHandlerMock = partialSpyOn(transientErrorHandlerModule, 'createTransientErrorHandler');
  const retryWithBackoffMock = partialSpyOn(retryWithBackoffModule, 'retryWithBackoff');
  const downloadFileMock = partialSpyOn(downloadFileModule, 'downloadFile');
  const writeDownloadStreamToFileMock = partialSpyOn(streamModule, 'writeDownloadStreamToFile');

  it('should download to temp, add to zip and cleanup temp file', async () => {
    // Given
    const downloadedStream = new ReadableStream<Uint8Array>();
    const zipSource = new ReadableStream<Uint8Array>();
    const zip = mockDeep<FlatFolderZip>();
    zip.addFile.mockResolvedValue(undefined);

    createTransientErrorHandlerMock.mockReturnValue(vi.fn());
    retryWithBackoffMock.mockImplementation(async (operation: () => Promise<unknown>) => {
      await operation();
      return { data: undefined };
    });
    downloadFileMock.mockResolvedValue(downloadedStream);
    writeDownloadStreamToFileMock.mockResolvedValue(undefined);
    createReadStreamMock.mockReturnValue({});
    convertToReadableStreamMock.mockReturnValue(zipSource);
    rmMock.mockResolvedValue(undefined);

    // When
    await addBackupFileToZip({
      file: { zipPath: 'Ubuntu/a.txt', bucketId: 'bucket-id', fileId: 'file-id' },
      zip,
      tempFolderPath: '/tmp/folder',
      networkApiUrl: 'https://api',
      bridgeUser: 'user',
      bridgePass: 'pass',
      encryptionKey: 'mnemonic',
      onDownloadProgress: vi.fn(),
    });

    // Then
    expect(downloadFileMock).toHaveBeenCalledTimes(1);
    expect(writeDownloadStreamToFileMock).toHaveBeenCalledTimes(1);
    expect(zip.addFile).toHaveBeenCalledTimes(1);
    expect(rmMock).toHaveBeenCalled();
  });
});
