import configStore from '../../../apps/main/config';

type Props = {
  folderUuid: string;
};

export function findBackupPathnameFromUuid({ folderUuid }: Props): string | undefined {
  const backupsList = configStore.get('backupList');
  const entryfound = Object.entries(backupsList).find(([, backup]) => backup.folderUuid === folderUuid);

  return entryfound?.[0];
}
