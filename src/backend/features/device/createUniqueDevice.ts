import { Device } from '../backup/types/Device';
import { hostname } from 'node:os';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { tryCreateDevice } from './tryCreateDevice';
import { addUnknownDeviceIssue } from './addUnknownDeviceIssue';
import { DeviceIdentifierDTO } from './device.types';
import { Result } from '../../../context/shared/domain/Result';
import { BackupError } from '../../../infra/drive-server/services/backup/backup.error';
/**
 * Creates a new device with a unique name
 * @returns Result containing the created device or an error if device creation fails after multiple attempts
 * @param attempts The number of attempts to create a device with a unique name, defaults to 1000
 */
export async function createUniqueDevice(
  deviceIdentifier: DeviceIdentifierDTO,
  attempts = 1000,
): Promise<Result<Device, Error>> {
  const baseName = hostname();
  const nameVariants = [baseName, ...Array.from({ length: attempts }, (_, i) => `${baseName} (${i + 1})`)];

  for (const name of nameVariants) {
    logger.debug({
      tag: 'BACKUPS',
      msg: `Trying to create device with name "${name}"`,
    });
    const { data, error } = await tryCreateDevice(name, deviceIdentifier);

    if (data) {
      return { data };
    }

    if (!(error instanceof BackupError && error.code === 'ALREADY_EXISTS')) {
      return { error };
    }
  }

  const finalError = logger.error({
    tag: 'BACKUPS',
    msg: 'Could not create device trying different names',
  });

  addUnknownDeviceIssue(finalError);
  return { error: finalError };
}
