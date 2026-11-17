import { AbsolutePath } from '../../context/local/localFile/infrastructure/AbsolutePath';

export type BackupInfo = {
  folderUuid: string;
  tmpPath: string;
  backupsBucket: string;
  pathname: AbsolutePath;
  name: string;
};
