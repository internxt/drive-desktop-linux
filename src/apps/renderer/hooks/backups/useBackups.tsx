import { useEffect, useState } from 'react';
import { Backup } from '../../../main/device/service';

export type BackupsState = 'LOADING' | 'ERROR' | 'SUCCESS';

export function useBackups() {
  const [state, setState] = useState<BackupsState>('LOADING');
  const [backups, setBackups] = useState<Array<Backup>>([]);

  async function fetchBackups(): Promise<void> {
    const backups = await window.electron.getBackups();

    setBackups(backups);
  }

  async function loadBackups() {
    setState('LOADING');

    try {
      await fetchBackups();
      setState('SUCCESS');
    } catch {
      setState('ERROR');
    }
  }

  useEffect(() => {
    loadBackups();
  }, []);

  async function disableBackup(backup: Backup) {
    await window.electron.disableBackup(backup);
    loadBackups();
  }

  async function addBackup() {
    try {
      await window.electron.addBackup();
      await loadBackups();
    } catch {
      setState('ERROR');
    }
  }

  return { state, backups, disableBackup, addBackup };
}
