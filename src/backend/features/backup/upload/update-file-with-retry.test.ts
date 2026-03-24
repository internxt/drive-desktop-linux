import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { DriveServerError } from '../../../../infra/drive-server/drive-server.error';
import { updateFileWithRetry } from './update-file-with-retry';
import * as uploadContentToEnvironmentModule from './upload-content-to-environment';
import * as overrideFileModule from '../../../../infra/drive-server/services/files/services/override-file';
import * as sleepModule from './utils/sleep';
import { BucketEntryIdMother } from '../../../../context/virtual-drive/shared/domain/__test-helpers__/BucketEntryIdMother';
import { UuidMother } from '../../../../context/shared/domain/__test-helpers__/UuidMother';

describe('updateFileWithRetry', () => {
  const uploadContentMock = partialSpyOn(uploadContentToEnvironmentModule, 'uploadContentToEnvironment');
  const overrideFileMock = partialSpyOn(overrideFileModule, 'overrideFile');
  const sleepMock = partialSpyOn(sleepModule, 'sleep');

  beforeEach(() => {
    sleepMock.mockResolvedValue(undefined);
  });

  const baseParams = {
    path: '/backup/file.txt',
    size: 1024,
    bucket: 'bucket',
    fileUuid: UuidMother.primitive(),
    environment: {} as any,
    signal: new AbortController().signal,
  };

  it('should update file successfully', async () => {
    uploadContentMock.mockResolvedValue({ data: BucketEntryIdMother.primitive() });
    overrideFileMock.mockResolvedValue({ data: true });

    const result = await updateFileWithRetry(baseParams);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('should return error when signal is aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const result = await updateFileWithRetry({ ...baseParams, signal: abortController.signal });

    expect(result.error).toBeInstanceOf(DriveDesktopError);
    expect(uploadContentMock).not.toHaveBeenCalled();
  });

  it('should return error after max retries when content upload fails', async () => {
    const uploadError = new DriveDesktopError('BAD_RESPONSE', 'Upload failed');
    uploadContentMock.mockResolvedValue({ error: uploadError });

    const result = await updateFileWithRetry(baseParams);

    expect(result.error).toBeInstanceOf(DriveDesktopError);
    expect(uploadContentMock).toHaveBeenCalledTimes(4);
    expect(sleepMock).toHaveBeenCalledTimes(3);
  });

  it('should return error after max retries when override fails', async () => {
    uploadContentMock.mockResolvedValue({ data: BucketEntryIdMother.primitive() });
    overrideFileMock.mockResolvedValue({ error: new DriveServerError('SERVER_ERROR', 500) });

    const result = await updateFileWithRetry(baseParams);

    expect(result.error).toBeInstanceOf(DriveDesktopError);
    expect(result.error?.cause).toBe('BAD_RESPONSE');
    expect(overrideFileMock).toHaveBeenCalledTimes(4);
  });

  it('should retry with correct delays', async () => {
    uploadContentMock.mockResolvedValue({ error: new DriveDesktopError('BAD_RESPONSE', 'fail') });

    await updateFileWithRetry(baseParams);

    expect(sleepMock).toHaveBeenNthCalledWith(1, 1000);
    expect(sleepMock).toHaveBeenNthCalledWith(2, 2000);
    expect(sleepMock).toHaveBeenNthCalledWith(3, 4000);
  });

  it('should succeed on retry after initial failure', async () => {
    const contentsId = BucketEntryIdMother.primitive();
    uploadContentMock
      .mockResolvedValueOnce({ error: new DriveDesktopError('BAD_RESPONSE', 'fail') })
      .mockResolvedValue({ data: contentsId });
    overrideFileMock.mockResolvedValue({ data: true });

    const result = await updateFileWithRetry(baseParams);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(uploadContentMock).toHaveBeenCalledTimes(2);
  });
});
