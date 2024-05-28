import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function useLastBackup() {
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<
    number | undefined
  >(undefined);

  function refreshLastBackupTimestamp() {
    window.electron.getLastBackupTimestamp().then(setLastBackupTimestamp);
  }

  useEffect(refreshLastBackupTimestamp, []);

  function fromNow(): string {
    return dayjs(lastBackupTimestamp).fromNow();
  }

  return {
    lastBackupTimestamp,
    refreshLastBackupTimestamp,
    fromNow,
  };
}
