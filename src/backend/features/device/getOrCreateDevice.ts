import { Device } from '../../../apps/main/device/service';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { addUnknownDeviceIssue } from './addUnknownDeviceIssue';
import { createAndSetupNewDevice } from './createAndSetupNewDevice';
import { getDeviceIdentifier } from './getDeviceIdentifier';
import { Result } from '../../../context/shared/domain/Result';
import { fetchSavedOrCurrentDevice, syncUserBackupsBucket } from './utils/getOrCreateDeviceHelpers';

async function handleFetchDeviceResult(deviceResult: Result<Device, Error>) {
  if (deviceResult.error) {
    logger.debug({ tag: 'BACKUPS', msg: '[DEVICE] Device not found, creating a new one' });
    const { error, data } = await createAndSetupNewDevice();

    if (error) {
      addUnknownDeviceIssue(error);
      return { error };
    }

    return { data };
  }

  syncUserBackupsBucket({ device: deviceResult.data });
  return { data: deviceResult.data };
}

export async function getOrCreateDevice() {
  try {
    const { error, data: deviceIdentifier } = getDeviceIdentifier();
    if (error) return { error };

    const deviceResult = await fetchSavedOrCurrentDevice({ deviceIdentifier });
    return await handleFetchDeviceResult(deviceResult);
  } catch (error) {
    const unknownError = error instanceof Error ? error : new Error('Unexpected error in getOrCreateDevice');
    logger.error({
      tag: 'BACKUPS',
      msg: '[DEVICE] Unexpected error in getOrCreateDevice',
      error: unknownError,
    });
    addUnknownDeviceIssue(unknownError);
    return { error: unknownError };
  }
}
