import * as clientInstance from '../../../client/drive-server.client.instance';
import { call, partialSpyOn } from '../../../../../../tests/vitest/utils.helper';
import { fetchFolderTotalSizeBytes } from './fetch-folder-total-size-bytes';

describe('fetch-folder-total-size-bytes', () => {
  const getMock = partialSpyOn(clientInstance.driveServerClient, 'GET');

  it('returns totalSize when request succeeds', async () => {
    getMock.mockResolvedValue({ data: { totalSize: 5000 }, error: undefined } as never);

    const result = await fetchFolderTotalSizeBytes('uuid-1');

    expect(result).toStrictEqual({ data: 5000 });
    call(getMock).toStrictEqual(['/folders/{uuid}/stats', { path: { uuid: 'uuid-1' } }]);
  });

  it('returns error when request fails', async () => {
    const err = new Error('network');
    getMock.mockResolvedValue({ data: undefined, error: err } as never);

    const result = await fetchFolderTotalSizeBytes('uuid-1');

    expect(result).toStrictEqual({ error: err });
  });
});
