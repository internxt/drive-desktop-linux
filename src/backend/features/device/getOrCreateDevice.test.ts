import configStore from '../../../apps/main/config';
import { DependencyInjectionUserProvider } from '../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { addUnknownDeviceIssue } from './addUnknownDeviceIssue';
import { createAndSetupNewDevice } from './createAndSetupNewDevice';
import { fetchDevice } from './fetchDevice';
import { fetchDeviceLegacyAndMigrate } from './fetchDeviceLegacyAndMigrate';
import { getDeviceIdentifier } from './getDeviceIdentifier';
import { getOrCreateDevice } from './getOrCreateDevice';

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
  const mockedFetchDeviceLegacyAndMigrate = vi.mocked(fetchDeviceLegacyAndMigrate);
  const mockedCreateAndSetupNewDevice = vi.mocked(createAndSetupNewDevice);
  const mockedConfigStore = vi.mocked(configStore);
  const mockedUserProviderGet = vi.mocked(DependencyInjectionUserProvider.get);
  const mockedUserProviderUpdate = vi.mocked(DependencyInjectionUserProvider.updateUser);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUserProviderGet.mockReturnValue({ backupsBucket: '' } as never);
    mockedConfigStore.get.mockImplementation((key: string) => {
      if (key === 'deviceId') return -1;
      if (key === 'deviceUUID') return '';
      return undefined;
    });
  });

  it('should return the identifier error when the device identifier is unavailable', async () => {
    const error = new Error('Unsupported platform');
    mockedGetDeviceIdentifier.mockReturnValue({ error });

    const result = await getOrCreateDevice();

    expect(result).toStrictEqual({ error });
    expect(mockedFetchDevice).not.toHaveBeenCalled();
    expect(mockedFetchDeviceLegacyAndMigrate).not.toHaveBeenCalled();
  });

  it('should return the existing device and update the user bucket when no saved identifiers exist', async () => {
    const user = { backupsBucket: '' };
    const device = {
      id: 1,
      uuid: 'device-uuid',
      name: 'Laptop',
      bucket: 'bucket-1',
      removed: false,
      hasBackups: true,
    };
    mockedUserProviderGet.mockReturnValue(user as never);
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    mockedFetchDevice.mockResolvedValue({ data: device } as never);

    const result = await getOrCreateDevice();

    expect(result).toStrictEqual({ data: device });
    expect(mockedFetchDevice).toHaveBeenCalledWith({
      deviceIdentifier: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    expect(user.backupsBucket).toBe('bucket-1');
    expect(mockedUserProviderUpdate).toHaveBeenCalledWith(user);
  });

  it('should create a new device when the current identifier lookup does not find one', async () => {
    const device = {
      id: 1,
      uuid: 'device-uuid',
      name: 'Laptop',
      bucket: 'bucket-1',
      removed: false,
      hasBackups: true,
    };
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    mockedFetchDevice.mockResolvedValue({ error: new Error('Not found') } as never);
    mockedCreateAndSetupNewDevice.mockResolvedValue({ data: device });

    const result = await getOrCreateDevice();

    expect(result).toStrictEqual({ data: device });
    expect(mockedCreateAndSetupNewDevice).toHaveBeenCalled();
  });

  it('should report the setup error when creating a new device fails', async () => {
    const setupError = new Error('Create device failed');
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    mockedFetchDevice.mockResolvedValue({ error: new Error('Not found') } as never);
    mockedCreateAndSetupNewDevice.mockResolvedValue({ error: setupError });

    const result = await getOrCreateDevice();

    expect(result).toStrictEqual({ error: setupError });
    expect(mockedAddUnknownDeviceIssue).toHaveBeenCalledWith(setupError);
  });

  it('should use the saved uuid when it exists in config', async () => {
    const device = {
      id: 1,
      uuid: 'saved-uuid',
      name: 'Laptop',
      bucket: 'bucket-1',
      removed: false,
      hasBackups: true,
    };
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    mockedConfigStore.get.mockImplementation((key: string) => {
      if (key === 'deviceId') return -1;
      if (key === 'deviceUUID') return 'saved-uuid';
      return undefined;
    });
    mockedFetchDeviceLegacyAndMigrate.mockResolvedValue({ data: device } as never);

    const result = await getOrCreateDevice();

    expect(result).toStrictEqual({ data: device });
    expect(mockedFetchDeviceLegacyAndMigrate).toHaveBeenCalledWith({ uuid: 'saved-uuid' });
    expect(mockedFetchDevice).not.toHaveBeenCalled();
  });

  it('should use the legacy id when there is no saved uuid', async () => {
    const device = {
      id: 1,
      uuid: 'legacy-uuid',
      name: 'Laptop',
      bucket: 'bucket-1',
      removed: false,
      hasBackups: true,
    };
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    mockedConfigStore.get.mockImplementation((key: string) => {
      if (key === 'deviceId') return 42;
      if (key === 'deviceUUID') return '';
      return undefined;
    });
    mockedFetchDeviceLegacyAndMigrate.mockResolvedValue({ data: device } as never);

    const result = await getOrCreateDevice();

    expect(result).toStrictEqual({ data: device });
    expect(mockedFetchDeviceLegacyAndMigrate).toHaveBeenCalledWith({ legacyId: '42' });
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
      const fetchError = new Error('Network error');
      mockedFetchDevice.mockRejectedValue(fetchError);

      const result = await getOrCreateDevice();

      expect(result.error).toBe(fetchError);
      expect(mockedAddUnknownDeviceIssue).toHaveBeenCalledWith(fetchError);
    });
  });
});
