import { AbsolutePath } from '../../context/local/localFile/infrastructure/AbsolutePath';

export type BackupInfo = {
  folderUuid: string;
  folderId: number;
  tmpPath: string;
  backupsBucket: string;
  pathname: AbsolutePath;
  name: string;
};
