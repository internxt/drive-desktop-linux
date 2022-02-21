import { ipcMain } from 'electron';
import { AccessResponse } from '../../renderer/pages/Login/service';
import {
  cleanBackgroundProcesses,
  startBackgroundProcesses,
} from '../background-processes';
import { cleanAndStartLocalWatcher } from '../realtime';
import { setupRootFolder } from '../sync-root-folder/service';
import { closeAuxWindows } from '../windows';
import { getWidget } from '../windows/widget';
import {
  getUser,
  getHeaders,
  canHisConfigBeRestored,
  setCredentials,
  logout,
} from './service';

let isLoggedIn: boolean;
setIsLoggedIn(!!getUser());

export function setIsLoggedIn(value: boolean) {
  isLoggedIn = value;

  getWidget()?.webContents.send('user-logged-in-changed', value);
}

export function getIsLoggedIn() {
  return isLoggedIn;
}

ipcMain.handle('is-user-logged-in', getIsLoggedIn);

ipcMain.handle('get-user', getUser);

ipcMain.handle('get-headers', (_, includeMnemonic) =>
  getHeaders(includeMnemonic)
);

export function onUserUnauthorized() {}

ipcMain.on('user-is-unauthorized', onUserUnauthorized);

ipcMain.on('user-logged-in', (_, data: AccessResponse) => {
  setCredentials(data.user, data.user.mnemonic, data.token);
  if (!canHisConfigBeRestored(data.user.uuid)) {
    setupRootFolder();
  }

  setIsLoggedIn(true);

  startBackgroundProcesses();
  cleanAndStartLocalWatcher();
});

ipcMain.on('user-logged-out', () => {
  cleanBackgroundProcesses();

  closeAuxWindows();

  logout();

  setIsLoggedIn(false);
});
