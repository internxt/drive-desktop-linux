import { useContext, useEffect, useState } from 'react';
import { BackupInfo } from '../../../backups/BackupInfo';
import { DeviceContext } from '../../context/DeviceContext';
import { Device } from '../../../main/device/service';
import { useDevices } from '../devices/useDevices';

export type BackupsState = 'LOADING' | 'ERROR' | 'SUCCESS';

export interface BackupContextProps {
  backupsState: BackupsState;
  backups: BackupInfo[];
  disableBackup: (backup: BackupInfo) => Promise<void>;
  addBackup: () => Promise<void>;
  deleteBackups: (device: Device, isCurrent?: boolean) => Promise<void>;
  downloadBackups: (device: Device) => Promise<void>;
  abortDownloadBackups: (device: Device) => void;
  isBackupAvailable: boolean;
  hasExistingBackups: boolean;
}

export function useBackups(): BackupContextProps {
  const { selected, current } = useContext(DeviceContext);
  const [backupsState, setBackupsState] = useState<BackupsState>('LOADING');
  const [backups, setBackups] = useState<Array<BackupInfo>>([]);
  const [isBackupAvailable, setIsBackupAvailable] = useState<boolean>(false);
  const [hasExistingBackups, setHasExistingBackups] = useState<boolean>(false);

  const { devices } = useDevices();

  async function fetchBackups(): Promise<void> {
    if (!selected) return;
    const backups = await window.electron.getBackupsFromDevice(
      selected,
      selected === current
    );
    setBackups(backups);
  }

  const isUserElegible = async () => {
    try {
      const isBackupsAvailable = await window.electron.backups.isAvailable();
      setIsBackupAvailable(isBackupsAvailable);
    } catch (error) {
      setIsBackupAvailable(false);
    }
  };

  const validateIfBackupExists = async () => {
    const existsBackup = devices.some((device) => device.hasBackups);
    setHasExistingBackups(existsBackup);
  };

  async function loadBackups() {
    setBackupsState('LOADING');
    setBackups([]);

    try {
      await fetchBackups();
      setBackupsState('SUCCESS');
    } catch {
      setBackupsState('ERROR');
      setBackups([]);
    }
  }

  useEffect(() => {
    loadBackups();
  }, []);

  useEffect(() => {
    isUserElegible();
    validateIfBackupExists();
    loadBackups();
  }, [selected, devices]);

  async function addBackup(): Promise<void> {
    try {
      await window.electron.addBackup();
      await loadBackups();
    } catch {
      setBackupsState('ERROR');
    }
  }

  async function disableBackup(backup: BackupInfo) {
    await window.electron.disableBackup(backup);
    await loadBackups();
  }

  async function deleteBackups(device: Device, isCurrent?: boolean) {
    setBackupsState('LOADING');
    try {
      await window.electron.deleteBackupsFromDevice(device, isCurrent);
      await fetchBackups();
      setBackupsState('SUCCESS');
    } catch (err) {
      console.log(err);
      setBackupsState('ERROR');
    }
  }

  async function downloadBackups(device: Device) {
    try {
      await window.electron.downloadBackup(device);
    } catch (error) {
      reportError(error);
    }
  }

  function abortDownloadBackups(device: Device) {
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
    isBackupAvailable,
    hasExistingBackups,
  };
}
