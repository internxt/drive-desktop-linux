import { useContext, useEffect, useState } from 'react';
import { DeviceContext } from '../../context/DeviceContext';

export interface DownloadBackupProgress {
  [key: string]: number | undefined;
}

export interface BackupDownloadContextProps {
  clearBackupDownloadProgress: (id: string) => void;
  thereIsDownloadProgress: boolean;
  downloadProgress: number;
}

export function useBackupDownloadProgress(): BackupDownloadContextProps {
  const { selected } = useContext(DeviceContext);

  const [backupDownloadProgress, setBackupDownloadProgress] = useState<DownloadBackupProgress>({});

  useEffect(() => {
    const removeListener = window.electron.onBackupDownloadProgress(
      ({ id, progress }: { id: string; progress: number }) => {
        const normalizedProgress = Math.round(progress * 100);
        const visibleProgress = progress > 0 && normalizedProgress === 0 ? 1 : normalizedProgress;

        setBackupDownloadProgress((prevState) => {
          return { ...prevState, [id]: visibleProgress };
        });
      },
    );
    return removeListener;
  }, []);

  const [thereIsDownloadProgress, setThereIsDownloadProgress] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  useEffect(() => {
    if (!selected?.uuid) return;
    const selectedProgress = backupDownloadProgress[selected.uuid];
    if (selectedProgress !== undefined && selectedProgress < 100) {
      setThereIsDownloadProgress(true);
      setDownloadProgress(selectedProgress);
    } else {
      setThereIsDownloadProgress(false);
      setDownloadProgress(0);
    }
  }, [selected, backupDownloadProgress]);

  function clearBackupDownloadProgress(id: string) {
    setBackupDownloadProgress((prevState) => {
      return { ...prevState, [id]: undefined };
    });
  }

  return {
    clearBackupDownloadProgress,
    thereIsDownloadProgress,
    downloadProgress,
  };
}
