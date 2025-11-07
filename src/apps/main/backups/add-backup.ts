import { getPathFromDialog } from "../device/service";
import configStore from "../config";
import { BackupInfo } from "src/apps/backups/BackupInfo";
import path from "node:path";
import { app } from "electron";
import { fetchFolder } from '../../../infra/drive-server/services/backup/services/fetch-folder';
import { createBackup } from "./create-backup";
import { migrateBackupEntryIfNeeded } from "../device/migrate-backup-entry-if-needed";
import { DeviceModule } from "../../../backend/features/device/device.module";
import { logger } from "@internxt/drive-desktop-core/build/backend";

export async function addBackup() {
  const device = await DeviceModule.getOrCreateDevice();
	if (device instanceof Error) {
		throw logger.error({ tag: 'BACKUPS', msg: 'Error adding backup: No device found' });
	}

  const chosenItem = await getPathFromDialog();
  if (!chosenItem || !chosenItem.path) {
    return;
  }

  const chosenPath = chosenItem.path;
  const backupList = configStore.get('backupList');
  const existingBackup = backupList[chosenPath];

  if (!existingBackup) {
    return createBackup({ pathname: chosenPath, device });
  }
  const migratedBackup = await migrateBackupEntryIfNeeded(chosenPath, existingBackup);

  let folderStillExists;
  try {
    await fetchFolder(migratedBackup.folderUuid);
    folderStillExists = true;
  } catch {
    folderStillExists = false;
  }

  if (!folderStillExists) {
    return createBackup({ pathname: chosenPath, device });
  }

  const updatedBackupList = configStore.get('backupList');
	updatedBackupList[chosenPath].enabled = true;
	configStore.set('backupList', updatedBackupList);

	const { base } = path.parse(chosenPath);
	const backupInfo: BackupInfo = {
		folderUuid: migratedBackup.folderUuid,
		folderId: migratedBackup.folderId,
		pathname: chosenPath,
		name: base,
		tmpPath: app.getPath('temp'),
		backupsBucket: device.bucket,
	}

	return backupInfo;
}