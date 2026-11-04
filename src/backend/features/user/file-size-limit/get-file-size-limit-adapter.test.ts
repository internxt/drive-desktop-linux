import { electronStore } from '../../../../apps/main/config';
import * as resolveUserFileSizeLimitModule from './resolve-user-file-size-limit';
import { call, calls, partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { getFileSizeLimitAdapter } from './get-file-size-limit-adapter';
import * as retryRejectedUploadsModule from './retry-rejected-uploads';

describe('get-file-size-limit-adapter', () => {
  const electronStoreGetMock = partialSpyOn(electronStore, 'get');
  const electronStoreSetMock = partialSpyOn(electronStore, 'set');
  const resolveUserFileSizeLimitMock = partialSpyOn(resolveUserFileSizeLimitModule, 'resolveUserFileSizeLimit');
  const retryRejectedUploadsMock = partialSpyOn(retryRejectedUploadsModule, 'retryRejectedUploads');

  it('should read the stored limit', () => {
    electronStoreGetMock.mockReturnValue(10);

    const res = getFileSizeLimitAdapter().getStoredLimit();

    expect(res).toBe(10);
    call(electronStoreGetMock).toBe('maxUploadFileSizeInBytes');
  });

  it('should save the limit and retry the rejected files if the limit goes up', () => {
    electronStoreGetMock.mockReturnValue(10);

    getFileSizeLimitAdapter().saveLimit({ limit: 20 });

    expect(electronStoreSetMock.mock.calls).toStrictEqual([['maxUploadFileSizeInBytes', 20]]);
    calls(retryRejectedUploadsMock).toHaveLength(1);
  });

  it('should save the limit without retrying the rejected files if the limit does not go up', () => {
    electronStoreGetMock.mockReturnValue(20);

    getFileSizeLimitAdapter().saveLimit({ limit: 20 });

    expect(electronStoreSetMock.mock.calls).toStrictEqual([['maxUploadFileSizeInBytes', 20]]);
    calls(retryRejectedUploadsMock).toHaveLength(0);
  });

  it('should read the last revalidation time', () => {
    electronStoreGetMock.mockReturnValue(1000);

    const res = getFileSizeLimitAdapter().getLastRevalidatedAt();

    expect(res).toBe(1000);
    call(electronStoreGetMock).toBe('fileSizeLimitRevalidatedAt');
  });

  it('should save the last revalidation time', () => {
    getFileSizeLimitAdapter().saveLastRevalidatedAt({ timestamp: 2000 });

    expect(electronStoreSetMock.mock.calls).toStrictEqual([['fileSizeLimitRevalidatedAt', 2000]]);
  });

  it('should fetch the limit', async () => {
    resolveUserFileSizeLimitMock.mockResolvedValue({ data: 30 });

    const res = await getFileSizeLimitAdapter().fetchLimit();

    expect(res).toStrictEqual({ data: 30 });
    call(resolveUserFileSizeLimitMock).toMatchObject({ signal: expect.any(AbortSignal) });
  });
});
