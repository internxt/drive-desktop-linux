import { BrowserWindow } from 'electron';
import { broadcastToWindows } from '../../../apps/main/windows';
import { DependencyInjectionUserProvider } from '../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { createNewDevice } from './createNewDevice';
import { createAndSetupNewDevice } from './createAndSetupNewDevice';
import { getDeviceIdentifier } from './getDeviceIdentifier';

vi.mock('electron', async (importOriginal) => {
  const actual = await importOriginal<typeof import('electron')>();

  return {
    ...actual,
    app: {
      ...actual.app,
      getPath: vi.fn().mockReturnValue('/tmp/backups'),
    },
    ipcMain: {
      ...actual.ipcMain,
      on: vi.fn(),
      handle: vi.fn(),
      removeHandler: vi.fn(),
    },
    BrowserWindow: {
      ...actual.BrowserWindow,
      getAllWindows: vi.fn(),
    },
  };
});
vi.mock('./getDeviceIdentifier');
vi.mock('./createNewDevice');
vi.mock('../../../apps/main/windows', () => ({
  broadcastToWindows: vi.fn(),
}));
vi.mock('../../../apps/shared/dependency-injection/DependencyInjectionUserProvider', () => ({
  DependencyInjectionUserProvider: { get: vi.fn(), updateUser: vi.fn() },
}));

describe('createAndSetupNewDevice', () => {
  const mockedGetDeviceIdentifier = vi.mocked(getDeviceIdentifier);
  const mockedCreateNewDevice = vi.mocked(createNewDevice);
  const mockedBroadcastToWindows = vi.mocked(broadcastToWindows);
  const mockedBrowserWindowGetAllWindows = vi.mocked(BrowserWindow.getAllWindows);
  const mockedUserProviderGet = vi.mocked(DependencyInjectionUserProvider.get);
  const mockedUserProviderUpdate = vi.mocked(DependencyInjectionUserProvider.updateUser);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUserProviderGet.mockReturnValue({ backupsBucket: '' } as never);
    mockedBrowserWindowGetAllWindows.mockReturnValue([] as never);
  });

  it('should return only error when the device identifier is unavailable', async () => {
    const error = new Error('Missing device identifier');
    mockedGetDeviceIdentifier.mockReturnValue({ error });

    const result = await createAndSetupNewDevice();

    expect(result).toStrictEqual({ error });
    expect(mockedCreateNewDevice).not.toHaveBeenCalled();
    expect(mockedBroadcastToWindows).not.toHaveBeenCalled();
  });

  it('should return only error when the device creation fails', async () => {
    const error = new Error('Create device failed');
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    mockedCreateNewDevice.mockResolvedValue({ error });

    const result = await createAndSetupNewDevice();

    expect(result).toStrictEqual({ error });
    expect(mockedBroadcastToWindows).not.toHaveBeenCalled();
    expect(mockedUserProviderUpdate).not.toHaveBeenCalled();
  });

  it('should update the user and notify windows when the device is created', async () => {
    const user = { backupsBucket: '' };
    const send = vi.fn();
    const device = {
      id: 1,
      uuid: 'device-uuid',
      name: 'Laptop',
      bucket: 'bucket-1',
      removed: false,
      hasBackups: true,
    };
    mockedUserProviderGet.mockReturnValue(user as never);
    mockedBrowserWindowGetAllWindows.mockReturnValue([{ webContents: { send } }] as never);
    mockedGetDeviceIdentifier.mockReturnValue({
      data: { key: 'key', platform: 'linux', hostname: 'host' },
    });
    mockedCreateNewDevice.mockResolvedValue({ data: device });

    const result = await createAndSetupNewDevice();

    expect(result).toStrictEqual({ data: device });
    expect(user.backupsBucket).toBe('bucket-1');
    expect(mockedUserProviderUpdate).toHaveBeenCalledWith(user);
    expect(send).toHaveBeenCalledWith('reinitialize-backups');
    expect(mockedBroadcastToWindows).toHaveBeenCalledWith('device-created', device);
  });
});
