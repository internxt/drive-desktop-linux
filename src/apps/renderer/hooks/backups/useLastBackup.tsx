import { useState } from 'react';

export function useLastBackup() {
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState(-1);

  function refreshLastBackupTimestamp() {
    window.electron.getLastBackupTimestamp().then(setLastBackupTimestamp);
  }

  return {
    lastBackupTimestamp,
    refreshLastBackupTimestamp,
  };
}
