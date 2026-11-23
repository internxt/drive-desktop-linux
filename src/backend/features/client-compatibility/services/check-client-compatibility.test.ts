import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { DriveServerError } from '../../../../infra/drive-server/drive-server.error';
import * as getClientCompatibilityModule from '../../../../infra/drive-server/services/client-compatibility/get-client-compatibility';
import * as state from './client-compatibility-state';
import { checkClientCompatibility } from './check-client-compatibility';

describe('check-client-compatibility', () => {
  const getClientCompatibilityMock = partialSpyOn(getClientCompatibilityModule, 'getClientCompatibility');
  const setClientCompatibilityMock = partialSpyOn(state, 'setClientCompatibility');

  it('should store the backend response', async () => {
    // Given
    const data = { status: 'unsupported', message: null, recommendedVersion: '2.8.0', sunsetAt: null } as const;
    getClientCompatibilityMock.mockResolvedValue({ data });
    // When
    await checkClientCompatibility();
    // Then
    call(setClientCompatibilityMock).toStrictEqual({ state: data });
  });

  it('should not block the client when the check fails', async () => {
    // Given
    getClientCompatibilityMock.mockResolvedValue({ error: new DriveServerError('NETWORK_ERROR') });
    // When
    await checkClientCompatibility();
    // Then
    expect(setClientCompatibilityMock).not.toHaveBeenCalled();
  });
});
