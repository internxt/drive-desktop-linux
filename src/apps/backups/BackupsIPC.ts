import { ipcRenderer } from 'electron';
import { TypedIPC } from '../shared/IPC/IPCs';
import { BackupData } from './BackupData';

export type MainProcessBackupsMessages = {
  'BACKUPS:GET_BACKUPS': () => Promise<BackupData>;
};

export type BackupsIPC = TypedIPC<MainProcessBackupsMessages, never>;

export const BackupsIPC = ipcRenderer as unknown as BackupsIPC;
