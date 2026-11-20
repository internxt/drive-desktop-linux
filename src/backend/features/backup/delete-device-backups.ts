import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { Device } from './types/Device';
import { DeviceModule } from '../device/device.module';
import { addFolderToTrash } from '../../../infra/drive-server/services/folder/services/add-folder-to-trash';
import { fetchFolder } from '../../../infra/drive-server/services/folder/services/fetch-folder';
import { deleteBackup } from './delete-backup';

type Props = {
  device: Device;
  isCurrent?: boolean;
};

export async function deleteDeviceBackups({ device, isCurrent }: Props) {
  const backups = await DeviceModule.getBackupsFromDevice(device, isCurrent);
  logger.debug({ tag: 'BACKUPS', msg: '[BACKUPS] Deleting backups from device', count: backups.length });
  logger.debug({ tag: 'BACKUPS', msg: '[BACKUPS] Backups details', backups });

  const backupDeletionPromises = backups.map((backup) => deleteBackup({ backup, isCurrent }));
  await Promise.all(backupDeletionPromises);

  try {
    // v.2.7.1
    // Esteban Galvis Triana
    // Orphan folders are siblings of the device folder. One content request is enough;
    // a global remote sync walks the whole drive and blocks deletion.
    const { data: folder, error } = await fetchFolder(device.uuid);
    if (error) {
      throw error;
    }

    const backupFolderUuids = new Set(backups.map((backup) => backup.folderUuid));
    const orphanUuids = folder.children
      .filter(
        (child) => child.status === 'EXISTS' && !child.deleted && !child.removed && !backupFolderUuids.has(child.uuid),
      )
      .map((child) => child.uuid);

    const folderDeletionPromises = orphanUuids.map(async (uuid) => {
      await addFolderToTrash(uuid);
    });
    await Promise.all(folderDeletionPromises);
  } catch (error) {
    throw logger.error({
      tag: 'BACKUPS',
      msg: 'Failed to delete orphan folders under device',
      error,
    });
  }
}
