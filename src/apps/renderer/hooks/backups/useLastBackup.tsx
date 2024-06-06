import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { BackupExitReason } from '../../../main/background-processes/backups/types/BackupExitReason';

dayjs.extend(relativeTime);

export function useLastBackup() {
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<
    number | undefined
  >(undefined);

  const [lastExistReason, setLastExistReason] = useState<BackupExitReason>();

  function refreshLastBackupTimestamp() {
    window.electron.getLastBackupTimestamp().then(setLastBackupTimestamp);
  }

  function refreshLastExitReason() {
    window.electron.getLastBackupExitReason().then(setLastExistReason);
  }

  useEffect(() => {
    refreshLastBackupTimestamp();
  }, []);

  useEffect(() => {
    refreshLastExitReason();
  }, [lastBackupTimestamp]);

  function fromNow(): string {
    return dayjs(lastBackupTimestamp).fromNow();
  }

  function lastBackupHadIssues() {
    return (
      lastExistReason !== 'FORCED_BY_USER' &&
      lastExistReason !== 'COMPLETED_BACKUPS'
    );
  }

  return {
    lastBackupTimestamp,
    lastExistReason,
    fromNow,
    lastBackupHadIssues,
  };
}
