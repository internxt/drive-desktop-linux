import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { Device } from './types/Device';
import { DeviceModule } from '../device/device.module';
import { addFolderToTrash } from '../../../infra/drive-server/services/folder/services/add-folder-to-trash';
import { DriveFoldersCollection } from '../../../apps/main/database/collections/DriveFolderCollection';
import { startRemoteSync } from '../../../apps/main/remote-sync/service';
import { listOrphanFolderUuidsUnderDeviceSqlite } from './list-orphan-folder-uuids-under-device-sqlite';
import { deleteBackup } from './delete-backup';

type Props = {
  device: Device;
  isCurrent?: boolean;
  deps?: {
    folders: DriveFoldersCollection;
  };
};

export async function deleteDeviceBackups({ device, isCurrent, deps }: Props) {
  const backups = await DeviceModule.getBackupsFromDevice(device, isCurrent);
  logger.debug({ tag: 'BACKUPS', msg: '[BACKUPS] Deleting backups from device', count: backups.length });
  logger.debug({ tag: 'BACKUPS', msg: '[BACKUPS] Backups details', backups });

  const backupDeletionPromises = backups.map((backup) => deleteBackup({ backup, isCurrent }));
  await Promise.all(backupDeletionPromises);

  const folders = deps?.folders ?? new DriveFoldersCollection();

  try {
    // v.2.6.0
    // Esteban Galvis Triana
    // Guard: orphan folders are resolved from SQLite; ensure folder rows are synced before querying children.
    await startRemoteSync();
    const orphanUuids = await listOrphanFolderUuidsUnderDeviceSqlite({
      folders,
      deviceFolderId: device.id,
      backups,
    });

    const folderDeletionPromises = orphanUuids.map(async (uuid) => {
      await addFolderToTrash(uuid);
    });
    await Promise.all(folderDeletionPromises);
  } catch (error) {
    logger.error({ tag: 'BACKUPS', msg: 'Error listing orphan folders under device from local database', error });
  }
}
