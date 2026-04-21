import configStore from '../../../apps/main/config';
import { BackupInfo } from '../../../apps/backups/BackupInfo';
import { addFolderToTrash } from '../../../infra/drive-server/services/folder/services/add-folder-to-trash';

type Props = {
  backup: BackupInfo;
  isCurrent?: boolean;
};

export async function deleteBackup({ backup, isCurrent }: Props): Promise<void> {
  const { error } = await addFolderToTrash(backup.folderUuid);
  if (error) {
    throw new Error('Request to delete backup wasnt succesful');
  }

  if (isCurrent) {
    const backupsList = configStore.get('backupList');
    const entriesFiltered = Object.entries(backupsList).filter(([, b]) => b.folderId !== backup.folderId);
    const backupListFiltered = Object.fromEntries(entriesFiltered);

    configStore.set('backupList', backupListFiltered);
  }
}
