import { BrowserWindow } from 'electron';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { left, right } from '../../../context/shared/domain/Either';
import { createAndSetupNewDevice } from './createAndSetupNewDevice';
import * as getDeviceIdentifierModule from './getDeviceIdentifier';
import * as createNewDeviceModule from './createNewDevice';
import * as getUserModule from '../auth/get-user';
import * as updateUserModule from '../auth/update-user';
import * as windowsModule from '../../../apps/main/windows';

describe('createAndSetupNewDevice', () => {
  const getDeviceIdentifierMock = partialSpyOn(getDeviceIdentifierModule, 'getDeviceIdentifier');
  const createNewDeviceMock = partialSpyOn(createNewDeviceModule, 'createNewDevice');
  const getUserMock = partialSpyOn(getUserModule, 'getUser');
  const updateUserMock = partialSpyOn(updateUserModule, 'updateUser');
  const broadcastToWindowsMock = partialSpyOn(windowsModule, 'broadcastToWindows');
  const getAllWindowsMock = partialSpyOn(BrowserWindow, 'getAllWindows');

  const userData = {
    userId: 'user-id',
    email: 'user@example.com',
    backupsBucket: 'old-bucket',
  };

  const device = {
    id: 42,
    uuid: 'device-uuid',
    name: 'Laptop',
    bucket: 'new-bucket',
    removed: false,
    hasBackups: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getAllWindowsMock.mockReturnValue([] as BrowserWindow[]);
  });

  it('should return the identifier error when the device identifier cannot be created', async () => {
    const error = new Error('Unsupported platform: linux');
    getDeviceIdentifierMock.mockReturnValue({ error });

    const result = await createAndSetupNewDevice();

    expect(result).toStrictEqual({ error });
    expect(createNewDeviceMock).not.toHaveBeenCalled();
  });

  it('should create the device, update the user bucket and notify the renderer when successful', async () => {
    const mockWindow = {
      webContents: { send: vi.fn() },
    } as unknown as BrowserWindow;

    getDeviceIdentifierMock.mockReturnValue({
      data: { key: 'device-id', platform: 'linux', hostname: 'test-host' },
    });
    createNewDeviceMock.mockResolvedValue(right(device));
    getUserMock.mockReturnValue({ data: userData });
    getAllWindowsMock.mockReturnValue([mockWindow]);

    const result = await createAndSetupNewDevice();

    expect(result).toStrictEqual({ data: device });
    expect(updateUserMock).toHaveBeenCalledWith({
      user: {
        ...userData,
        backupsBucket: device.bucket,
      },
    });
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('reinitialize-backups');
    call(broadcastToWindowsMock).toStrictEqual(['device-created', device]);
    call(loggerMock.debug).toMatchObject({
      tag: 'BACKUPS',
      msg: '[DEVICE] Created new device',
      deviceUUID: device.uuid,
    });
  });

  it('should return the creation error and log it when the device cannot be created', async () => {
    const error = new Error('device creation failed');

    getDeviceIdentifierMock.mockReturnValue({
      data: { key: 'device-id', platform: 'linux', hostname: 'test-host' },
    });
    createNewDeviceMock.mockResolvedValue(left(error));

    const result = await createAndSetupNewDevice();

    expect(result).toStrictEqual({ error });
    call(loggerMock.error).toMatchObject({
      tag: 'BACKUPS',
      msg: '[DEVICE] Error creating new device',
      error,
    });
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(broadcastToWindowsMock).not.toHaveBeenCalled();
  });
});
