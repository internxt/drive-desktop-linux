import { Device } from './../../../apps/main/device/service';
import { Result } from '../../../context/shared/domain/Result';
import { driveServerModule } from './../../../infra/drive-server/drive-server.module';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { BackupError } from '../../../infra/drive-server/services/backup/backup.error';
import { DeviceIdentifierDTO } from './device.types';

export async function tryCreateDevice(
  deviceName: string,
  deviceIdentifier: DeviceIdentifierDTO,
): Promise<Result<Device, Error>> {
  const createDeviceEither = await driveServerModule.backup.createDeviceWithIdentifier({
    name: deviceName,
    key: deviceIdentifier.key,
    hostname: deviceIdentifier.hostname,
    platform: deviceIdentifier.platform,
  });

  if (createDeviceEither.isRight()) {
    return { data: createDeviceEither.getRight() };
  }

  const createDeviceError = createDeviceEither.getLeft();
  if (createDeviceError instanceof BackupError && createDeviceError.code === 'ALREADY_EXISTS') {
    logger.debug({
      tag: 'BACKUPS',
      msg: 'Device name already exists',
      deviceName,
    });
    return { error: createDeviceError };
  }

  logger.error({
    tag: 'BACKUPS',
    msg: 'Error creating device',
    error: createDeviceError,
  });
  return { error: createDeviceError };
}
