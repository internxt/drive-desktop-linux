import configStore from '../../../../apps/main/config';
import { Device } from '../../../../apps/main/device/service';
import { DependencyInjectionUserProvider } from '../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { fetchDevice } from '../fetchDevice';
import { fetchDeviceLegacyAndMigrate } from '../fetchDeviceLegacyAndMigrate';
import {
  fetchSavedOrCurrentDevice,
  getSavedDeviceIdentifiers,
  resolveFetchProps,
  syncUserBackupsBucket,
} from './getOrCreateDeviceHelpers';

vi.mock('../fetchDevice');
vi.mock('../fetchDeviceLegacyAndMigrate');
vi.mock('../../../../apps/main/config', () => ({
  default: { get: vi.fn() },
}));
vi.mock('../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider', () => ({
  DependencyInjectionUserProvider: { get: vi.fn(), updateUser: vi.fn() },
}));

describe('getOrCreateDeviceHelpers', () => {
  const mockedConfigStore = vi.mocked(configStore);
  const mockedFetchDevice = vi.mocked(fetchDevice);
  const mockedFetchDeviceLegacyAndMigrate = vi.mocked(fetchDeviceLegacyAndMigrate);
  const mockedUserProviderGet = vi.mocked(DependencyInjectionUserProvider.get);
  const mockedUserProviderUpdate = vi.mocked(DependencyInjectionUserProvider.updateUser);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedConfigStore.get.mockImplementation((key: string) => {
      if (key === 'deviceId') return -1;
      if (key === 'deviceUUID') return '';
      return undefined;
    });
  });

  it('should read the saved device identifiers from config', () => {
    const result = getSavedDeviceIdentifiers();

    expect(result).toStrictEqual({
      legacyId: -1,
      savedUUID: '',
      hasLegacyId: false,
      hasUuid: false,
    });
  });

  it('should resolve current identifier props when there are no saved identifiers', () => {
    const result = resolveFetchProps({
      deviceIdentifier: { key: 'key', platform: 'linux', hostname: 'host' },
      savedDeviceIdentifiers: {
        legacyId: -1,
        savedUUID: '',
        hasLegacyId: false,
        hasUuid: false,
      },
    });

    expect(result).toStrictEqual({
      deviceIdentifier: { key: 'key', platform: 'linux', hostname: 'host' },
    });
  });

  it('should resolve saved uuid props when they exist', () => {
    const result = resolveFetchProps({
      deviceIdentifier: { key: 'key', platform: 'linux', hostname: 'host' },
      savedDeviceIdentifiers: {
        legacyId: -1,
        savedUUID: 'saved-uuid',
        hasLegacyId: false,
        hasUuid: true,
      },
    });

    expect(result).toStrictEqual({ uuid: 'saved-uuid' });
  });

  it('should fetch the current device when no saved identifiers exist', async () => {
    const device = {
      id: 1,
      uuid: 'device-uuid',
      name: 'Laptop',
      bucket: 'bucket-1',
      removed: false,
      hasBackups: true,
    } satisfies Device;
    mockedFetchDevice.mockResolvedValue({ data: device });

    const result = await fetchSavedOrCurrentDevice({
      deviceIdentifier: { key: 'key', platform: 'linux', hostname: 'host' },
    });

    expect(result).toStrictEqual({ data: device });
    expect(mockedFetchDevice).toHaveBeenCalledWith({
      deviceIdentifier: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    expect(mockedFetchDeviceLegacyAndMigrate).not.toHaveBeenCalled();
  });

  it('should fetch the saved device when a uuid is stored', async () => {
    const device = {
      id: 1,
      uuid: 'saved-uuid',
      name: 'Laptop',
      bucket: 'bucket-1',
      removed: false,
      hasBackups: true,
    } satisfies Device;
    mockedConfigStore.get.mockImplementation((key: string) => {
      if (key === 'deviceId') return -1;
      if (key === 'deviceUUID') return 'saved-uuid';
      return undefined;
    });
    mockedFetchDeviceLegacyAndMigrate.mockResolvedValue({ data: device });

    const result = await fetchSavedOrCurrentDevice({
      deviceIdentifier: { key: 'key', platform: 'linux', hostname: 'host' },
    });

    expect(result).toStrictEqual({ data: device });
    expect(mockedFetchDeviceLegacyAndMigrate).toHaveBeenCalledWith({ uuid: 'saved-uuid' });
  });

  it('should sync the user backup bucket from the device', () => {
    const user = { backupsBucket: '' };
    mockedUserProviderGet.mockReturnValue(user as never);

    syncUserBackupsBucket({
      device: {
        id: 1,
        uuid: 'device-uuid',
        name: 'Laptop',
        bucket: 'bucket-1',
        removed: false,
        hasBackups: true,
      },
    });

    expect(user.backupsBucket).toBe('bucket-1');
    expect(mockedUserProviderUpdate).toHaveBeenCalledWith(user);
  });
});
