import { BackupInfo } from '../../../../backups/BackupInfo';
import { ProcessFatalErrorName } from '../../../../main/background-processes/backups/BackupFatalErrors/BackupFatalErrors';

export type MainProcessBackupsMessages = {
  'backups.get-backup': () => Promise<BackupInfo>;

  'backups.backup-completed': (folderId: number) => void;

  'backups.backup-failed': (
    folderId: number,
    error: ProcessFatalErrorName
  ) => void;

  'backups.process-error': (message: string) => void;
};
