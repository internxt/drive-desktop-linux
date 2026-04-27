import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Device } from '../backup/types/Device';
import { Result } from '../../../context/shared/domain/Result';
import { driveServerModule } from '../../../infra/drive-server/drive-server.module';
import { getDeviceIdentifier } from './getDeviceIdentifier';

export async function renameDevice(deviceName: string): Promise<Result<Device, Error>> {
  try {
    const { error, data: deviceIdentifier } = getDeviceIdentifier();
    if (error) return { error };

    const response = await driveServerModule.backup.updateDeviceByIdentifier(deviceIdentifier.key, deviceName);
    if (response.isRight()) {
      return { data: response.getRight() };
    }

    const requestError = response.getLeft();
    logger.error({
      tag: 'BACKUPS',
      msg: 'Error in the request to rename a device',
      error: requestError,
    });
    return { error: requestError };
  } catch (error) {
    const unexpectedError = error instanceof Error ? error : new Error('Unexpected error renaming device');
    logger.error({
      tag: 'BACKUPS',
      msg: 'Unexpected error renaming device',
      error: unexpectedError,
    });
    return { error: unexpectedError };
  }
}
