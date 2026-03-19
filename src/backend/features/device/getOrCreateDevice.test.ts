import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrCreateDevice } from './getOrCreateDevice';
import { getDeviceIdentifier } from './getDeviceIdentifier';
import { addUnknownDeviceIssue } from './addUnknownDeviceIssue';
import { fetchDevice } from './fetchDevice';
import configStore from '../../../apps/main/config';

vi.mock('./getDeviceIdentifier');
vi.mock('./addUnknownDeviceIssue');
vi.mock('./fetchDevice');
vi.mock('./fetchDeviceLegacyAndMigrate');
vi.mock('./createAndSetupNewDevice');
vi.mock('../../../apps/main/config', () => ({
  default: { get: vi.fn() },
}));
vi.mock('../../../apps/shared/dependency-injection/DependencyInjectionUserProvider', () => ({
  DependencyInjectionUserProvider: { get: vi.fn(), updateUser: vi.fn() },
}));

describe('getOrCreateDevice', () => {
  const mockedGetDeviceIdentifier = vi.mocked(getDeviceIdentifier);
  const mockedAddUnknownDeviceIssue = vi.mocked(addUnknownDeviceIssue);
  const mockedFetchDevice = vi.mocked(fetchDevice);
  const mockedConfigStore = vi.mocked(configStore);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when an unexpected error is thrown', () => {
    it('should return the error and call addUnknownDeviceIssue', async () => {
      const unexpectedError = new Error('Unexpected failure');
      mockedGetDeviceIdentifier.mockImplementation(() => {
        throw unexpectedError;
      });

      const result = await getOrCreateDevice();

      expect(result.error).toBe(unexpectedError);
      expect(mockedAddUnknownDeviceIssue).toHaveBeenCalledWith(unexpectedError);
    });

    it('should wrap non-Error throws in an Error instance', async () => {
      mockedGetDeviceIdentifier.mockImplementation(() => {
        throw 'something went wrong';
      });

      const result = await getOrCreateDevice();

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Unexpected error in getOrCreateDevice');
      expect(mockedAddUnknownDeviceIssue).toHaveBeenCalledWith(result.error);
    });

    it('should return the error when fetchDevice throws', async () => {
      mockedGetDeviceIdentifier.mockReturnValue({
        data: { key: 'key', platform: 'linux', hostname: 'host' },
      });
      mockedConfigStore.get.mockImplementation((key: string) => {
        if (key === 'deviceId') return -1;
        if (key === 'deviceUUID') return '';
        return undefined;
      });
      const fetchError = new Error('Network error');
      mockedFetchDevice.mockRejectedValue(fetchError);

      const result = await getOrCreateDevice();

      expect(result.error).toBe(fetchError);
      expect(mockedAddUnknownDeviceIssue).toHaveBeenCalledWith(fetchError);
    });
  });
});
