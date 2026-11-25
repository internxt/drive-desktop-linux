import { loggerMock } from '../../../../../tests/vitest/mocks.helper';
import { call, calls, partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import configStore from '../../../../apps/main/config';
import { DriveServerError } from '../../../../infra/drive-server/drive-server.error';
import * as getUserFileSizeLimitModule from '../../../../infra/drive-server/services/files/services/get-user-file-size-limit';
import { resolveUserFileSizeLimit } from './resolve-user-file-size-limit';

describe('resolve-user-file-size-limit', () => {
  const getUserFileSizeLimitMock = partialSpyOn(getUserFileSizeLimitModule, 'getUserFileSizeLimit');
  const configSetMock = partialSpyOn(configStore, 'set');

  let props: Parameters<typeof resolveUserFileSizeLimit>[0];

  beforeEach(() => {
    props = { signal: AbortSignal.timeout(10_000) };
  });

  it('should return and store a fresh valid user file size limit', async () => {
    // Given
    getUserFileSizeLimitMock.mockResolvedValue({ data: 1024 });

    // When
    const result = await resolveUserFileSizeLimit(props);

    // Then
    expect(result).toStrictEqual({ data: 1024 });
    call(configSetMock).toStrictEqual(['maxUploadFileSizeInBytes', 1024]);
    call(getUserFileSizeLimitMock).toMatchObject({ signal: props?.signal });
    call(loggerMock.debug).toMatchObject({
      tag: 'SYNC-ENGINE',
      msg: 'Resolved user file size limit from API',
    });
  });

  it('should return the request error when the request fails', async () => {
    // Given
    const error = new DriveServerError('NETWORK_ERROR', 500, 'Network error');
    getUserFileSizeLimitMock.mockResolvedValue({ error });

    // When
    const result = await resolveUserFileSizeLimit(props);

    // Then
    expect(result).toStrictEqual({ error });
    calls(configSetMock).toHaveLength(0);
    call(loggerMock.error).toMatchObject({
      tag: 'SYNC-ENGINE',
      msg: 'Unable to resolve user file size limit',
      error,
    });
  });

  it('should return an error when the limit is missing', async () => {
    // Given
    getUserFileSizeLimitMock.mockResolvedValue({ data: null });

    // When
    const result = await resolveUserFileSizeLimit(props);

    // Then
    expect(result.error).toBeInstanceOf(Error);
    expect(result.data).toBeUndefined();
    calls(configSetMock).toHaveLength(0);
  });
});
