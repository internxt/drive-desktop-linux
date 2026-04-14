import { logger } from '@internxt/drive-desktop-core/build/backend';
import configStore from '../../../../apps/main/config';
import { Device } from '../../../../apps/main/device/service';
import { DependencyInjectionUserProvider } from '../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { Result } from '../../../../context/shared/domain/Result';
import { DeviceIdentifierDTO } from '../device.types';
import { fetchDevice } from '../fetchDevice';
import { fetchDeviceLegacyAndMigrate } from '../fetchDeviceLegacyAndMigrate';

export type SavedDeviceIdentifiers = {
  legacyId: number;
  savedUUID: string;
  hasLegacyId: boolean;
  hasUuid: boolean;
};

export function syncUserBackupsBucket({ device }: { device: Device }) {
  const user = DependencyInjectionUserProvider.get();
  user.backupsBucket = device.bucket;
  DependencyInjectionUserProvider.updateUser(user);
}

export function getSavedDeviceIdentifiers() {
  const legacyId = configStore.get('deviceId');
  const savedUUID = configStore.get('deviceUUID');

  logger.debug({
    tag: 'BACKUPS',
    msg: '[DEVICE] Checking saved device identifiers',
    legacyId,
    savedUUID,
  });

  return {
    legacyId,
    savedUUID,
    hasLegacyId: legacyId !== -1,
    hasUuid: savedUUID !== '',
  } satisfies SavedDeviceIdentifiers;
}

export function resolveFetchProps({
  deviceIdentifier,
  savedDeviceIdentifiers,
}: {
  deviceIdentifier: DeviceIdentifierDTO;
  savedDeviceIdentifiers: SavedDeviceIdentifiers;
}) {
  if (!savedDeviceIdentifiers.hasLegacyId && !savedDeviceIdentifiers.hasUuid) {
    return { deviceIdentifier };
  }

  /* eventually, this whole if section is going to be replaced
    when all the users naturaly migrated to the new identification mechanism */
  return savedDeviceIdentifiers.hasUuid
    ? { uuid: savedDeviceIdentifiers.savedUUID }
    : { legacyId: savedDeviceIdentifiers.legacyId.toString() };
}

export async function fetchSavedOrCurrentDevice({
  deviceIdentifier,
}: {
  deviceIdentifier: DeviceIdentifierDTO;
}): Promise<Result<Device, Error>> {
  const savedDeviceIdentifiers = getSavedDeviceIdentifiers();
  const props = resolveFetchProps({ deviceIdentifier, savedDeviceIdentifiers });

  if ('deviceIdentifier' in props) {
    return await fetchDevice(props);
  }

  return await fetchDeviceLegacyAndMigrate(props);
}
