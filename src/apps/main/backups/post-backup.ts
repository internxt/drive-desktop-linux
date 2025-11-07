import { Device } from "../device/service";
import { createBackupFolder } from '../../../infra/drive-server/services/backup/services/create-backup-folder';

export type Backup = { id: number; name: string; uuid: string };

type Props = {
	folderName: string;
	device: Device;
}

export async function postBackup({ folderName, device }: Props) {
  const createdBackup = await createBackupFolder(device.uuid, folderName);
  if (createdBackup.error) {
    throw createdBackup.error;
  }

	const backup: Backup = {
		id: createdBackup.data.id,
		name: createdBackup.data.plainName,
		uuid: createdBackup.data.uuid,
	};

	return backup;
}