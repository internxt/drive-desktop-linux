import { DependencyInjectionUserProvider } from './../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { createNewDevice } from './createNewDevice';
import { BrowserWindow } from 'electron';
import { broadcastToWindows } from '../../../apps/main/windows';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getDeviceIdentifier } from './getDeviceIdentifier';

export async function createAndSetupNewDevice() {
  const { error, data: deviceIdentifier } = getDeviceIdentifier();
  if (error) return { error };

  const { error: createDeviceError, data: device } = await createNewDevice(deviceIdentifier);
  if (createDeviceError) {
    logger.error({
      tag: 'BACKUPS',
      msg: '[DEVICE] Error creating new device',
      error: createDeviceError,
    });
    return { error: createDeviceError };
  }

  const user = DependencyInjectionUserProvider.get();
  user.backupsBucket = device.bucket;
  DependencyInjectionUserProvider.updateUser(user);

  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('reinitialize-backups');
  }
  broadcastToWindows('device-created', device);
  logger.debug({
    tag: 'BACKUPS',
    msg: '[DEVICE] Created new device',
    deviceUUID: device.uuid,
  });
  return { data: device };
}
