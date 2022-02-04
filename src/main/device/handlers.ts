import { ipcMain } from 'electron';
import {
  addBackup,
  getBackupsFromDevice,
  getOrCreateDevice,
  renameDevice,
} from './service';

ipcMain.handle('get-or-create-device', getOrCreateDevice);

ipcMain.handle('rename-device', (_, v) => renameDevice(v));

ipcMain.handle('get-backups', getBackupsFromDevice);

ipcMain.handle('add-backup', addBackup);
