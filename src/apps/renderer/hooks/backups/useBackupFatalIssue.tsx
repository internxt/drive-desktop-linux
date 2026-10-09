import { useEffect, useState } from 'react';
import { SyncError } from '../../../../shared/issues/SyncErrorCause';
import { BackupInfo } from '../../../backups/BackupInfo';
import { useTranslationContext } from '../../context/LocalContext';
import { shortMessages } from '../../messages/virtual-drive-error';

type Action = {
  name: string;
  fn: undefined | ((backup: BackupInfo) => Promise<void>);
};

type BackupErrorActionMap = Partial<Record<SyncError, Action>>;

export const backupsErrorActions: BackupErrorActionMap = {
  BASE_DIRECTORY_DOES_NOT_EXIST: {
    name: 'issues.actions.find-folder',
    fn: findBackupFolder,
  },
};

type FixAction = {
  name: string;
  fn: () => Promise<void>;
};

export function useBackupFatalIssue(backup: BackupInfo) {
  const [issue, setIssue] = useState<SyncError | undefined>(undefined);
  const [message, setMessage] = useState<string>('');
  const [action, setAction] = useState<FixAction | undefined>(undefined);

  const { translate } = useTranslationContext();

  useEffect(() => {
    window.electron.getBackupErrorByFolder(backup.folderId).then((backupError) => setIssue(backupError?.error));
  }, []);

  useEffect(() => {
    if (!issue) {
      return;
    }

    const key = shortMessages[issue];
    setMessage(translate(key));

    const action = backupsErrorActions[issue];

    if (action) {
      setAction({
        name: translate(action.name),
        fn: async () => {
          if (!action.fn) {
            return;
          }

          action?.fn(backup);
        },
      });
    }
  }, [issue]);

  return { issue, message, action };
}

async function findBackupFolder(backup: BackupInfo) {
  const chosen = await window.electron.getFolderPath();
  if (!chosen) return;

  const { data } = await window.electron.changeBackupPath({ currentPath: backup.pathname, newPath: chosen.path });
  if (data) window.electron.startBackupsProcess();
}
