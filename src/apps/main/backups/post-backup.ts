import { Device } from "../device/service";
import { Backup } from "./types";
import { createBackupFolder } from '../../../infra/drive-server/services/backup/services/create-backup-folder';
import { logger } from "@internxt/drive-desktop-core/build/backend";

type Props = {
	folderName: string;
	device: Device;
}

export async function postBackup({ folderName, device }: Props) {
  const createdBackup = await createBackupFolder(device.uuid, folderName);
  if (createdBackup.error) {
		logger.error({
			tag: 'BACKUPS',
			msg: 'Error creating backup folder',
			folderName,
			error: createdBackup.error,
		});
		return;
  }

	return {
		id: createdBackup.data.id,
		name: createdBackup.data.plainName,
		uuid: createdBackup.data.uuid,
	} as Backup;
}