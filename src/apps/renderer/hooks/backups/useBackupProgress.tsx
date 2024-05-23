import { useEffect, useState } from 'react';
import { BackupProgress } from '../../../main/background-processes/backups/types/BackupProgress';

export function useBackupProgress() {
  const [backupProgress, setBackupProgress] = useState<null | BackupProgress>(
    null
  );

  useEffect(() => {
    const removeListener = window.electron.onBackupProgress(setBackupProgress);

    return removeListener;
  }, []);

  function clearProgress() {
    setBackupProgress(null);
  }

  function percentualProgress(): number {
    if (!backupProgress) {
      throw new Error('Cannot calculate percentual progress');
    }

    const partialProgress = backupProgress.totalItems
      ? backupProgress.completedItems! / backupProgress.totalItems
      : 0;

    const totalProgress =
      (backupProgress.currentFolder - 1 + partialProgress) /
      backupProgress.totalFolders;

    return totalProgress * 100;
  }

  function thereIsProgress(): boolean {
    return backupProgress !== null;
  }

  return { backupProgress, thereIsProgress, percentualProgress, clearProgress };
}
