import { useContext, useEffect, useState } from 'react';
import { BackupInfo } from '../../../backups/BackupInfo';
import { DeviceContext } from '../../context/DeviceContext';
import { Device } from '../../../../backend/features/backup/types/Device';
import { AbsolutePath } from '../../../../context/local/localFile/infrastructure/AbsolutePath';

export type BackupsState = 'LOADING' | 'ERROR' | 'SUCCESS';

export interface BackupContextProps {
  backupsState: BackupsState;
  backups: BackupInfo[];
  disableBackup: (backup: BackupInfo) => Promise<void>;
  addBackup: () => Promise<void>;
  deleteBackups: (device: Device, isCurrent?: boolean) => Promise<boolean>;
  downloadBackups: (device: Device, pathName: AbsolutePath) => Promise<void>;
  abortDownloadBackups: (device: Device) => void;
  hasExistingBackups: boolean;
}

export function useBackups(): BackupContextProps {
  const { selected, current, devices } = useContext(DeviceContext);
  const [backupsState, setBackupsState] = useState<BackupsState>('LOADING');
  const [backups, setBackups] = useState<Array<BackupInfo>>([]);
  const [hasExistingBackups, setHasExistingBackups] = useState(false);

  async function fetchBackups(): Promise<boolean> {
    if (!selected) return true;

    const { error, data } = await window.electron.getBackupsFromDevice(selected, selected === current);
    if (error || !data) {
      setBackups([]);
      return false;
    }

    setBackups(data);
    return true;
  }

  const validateIfBackupExists = async () => {
    const existsBackup = devices.some((device) => device.hasBackups);
    setHasExistingBackups(existsBackup);
  };

  async function loadBackups() {
    setBackupsState('LOADING');
    setBackups([]);

    const isLoaded = await fetchBackups();
    if (!isLoaded) {
      setBackupsState('ERROR');
      setBackups([]);
      return;
    }

    setBackupsState('SUCCESS');
  }

  useEffect(() => {
    loadBackups();
  }, []);

  useEffect(() => {
    validateIfBackupExists();
    loadBackups();
  }, [selected, devices]);

  async function addBackup() {
    const { data: newBackup, error } = await window.electron.addBackup();
    if (error) return;

    setBackups((prevBackups) => {
      const existingIndex = prevBackups.findIndex((backup) => backup.folderId === newBackup.folderId);

      if (existingIndex === -1) {
        return [...prevBackups, newBackup];
      }

      const updatedBackups = [...prevBackups];
      updatedBackups[existingIndex] = newBackup;
      return updatedBackups;
    });
  }

  async function disableBackup(backup: BackupInfo) {
    await window.electron.disableBackup(backup);
    setBackups((prevBackups) => prevBackups.filter((b) => b.folderUuid !== backup.folderUuid));
  }

  async function deleteBackups(device: Device, isCurrent?: boolean): Promise<boolean> {
    setBackupsState('LOADING');
    try {
      await window.electron.deleteBackupsFromDevice(device, isCurrent);
      await fetchBackups();
      setBackupsState('SUCCESS');
      return true;
    } catch (err) {
      window.electron.logger.error({ tag: 'BACKUPS', msg: 'Error deleting backups from device', error: err });
      setBackupsState('ERROR');
      return false;
    }
  }

  async function downloadBackups(device: Device, pathName: AbsolutePath) {
    if (!selected) return;
    await window.electron.downloadBackup(device, pathName);
  }

  function abortDownloadBackups(device: Device) {
    if (!selected) return;
    return window.electron.abortDownloadBackups(device.uuid);
  }

  return {
    backupsState,
    backups,
    disableBackup,
    addBackup,
    deleteBackups,
    downloadBackups,
    abortDownloadBackups,
    hasExistingBackups,
  };
}
