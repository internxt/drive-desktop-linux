import { ipcMain } from 'electron';

import eventBus from '../event-bus';
import { getWidget } from '../windows/widget';
import { createTokenScheduleWithRetry } from './refresh-token/create-token-schedule-with-retry';
import { getNewApiHeaders, getUser, logout } from './service';
import { getCredentials } from './get-credentials';

let isLoggedIn = false;

function initializeLoginState() {
  const { newToken } = getCredentials();
  if (getUser() && newToken) {
    isLoggedIn = true;
  }
}

export function setIsLoggedIn(value: boolean) {
  isLoggedIn = value;
  getWidget()?.webContents.send('user-logged-in-changed', value);
}

export function getIsLoggedIn() {
  return isLoggedIn;
}

ipcMain.handle('is-user-logged-in', getIsLoggedIn);

ipcMain.handle('get-user', getUser);

ipcMain.handle('get-headers-for-new-api', () => getNewApiHeaders());

export function closeUserSession() {
  setIsLoggedIn(false);
  logout();
}

ipcMain.on('user-logged-out', closeUserSession);

eventBus.on('APP_IS_READY', async (): Promise<void> => {
  initializeLoginState();

  if (isLoggedIn) {
    await createTokenScheduleWithRetry();
    eventBus.emit('USER_LOGGED_IN');
  }
});
