import { ipcRenderer } from 'electron';
import { TypedIPC } from '../shared/IPC/IPCs';
import { BackupInfo } from './BackupInfo';

export type MainProcessBackupsMessages = {
  'BACKUPS:GET_BACKUPS': () => Promise<BackupInfo>;
};

export type BackupsIPC = TypedIPC<MainProcessBackupsMessages, never>;

export const BackupsIPC = ipcRenderer as unknown as BackupsIPC;
