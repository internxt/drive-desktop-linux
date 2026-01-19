import { useEffect, useState } from 'react';
import { BackupError } from '../../../../backend/features/backup/BackupFatalErrors';

export default function useBackupErrors() {
  const [errors, setErrors] = useState<BackupError[]>([]);

  useEffect(() => {
    window.electron.getBackupFatalErrors().then(setErrors);

    const removeListener = window.electron.onBackupFatalErrorsChanged(setErrors);

    return removeListener;
  }, []);

  return { backupErrors: errors };
}
