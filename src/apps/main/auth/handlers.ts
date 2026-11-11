import { ipcMain } from 'electron';

import eventBus from '../event-bus';
import { getWidget } from '../windows/widget';
import { createTokenScheduleWithRetry } from './refresh-token/create-token-schedule-with-retry';
import { getNewApiHeaders, logout } from '../../../backend/features/auth';
import { getUser } from '../../../backend/features/auth/user-session';
import { getCredentials } from './get-credentials';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { isClientUnsupported } from '../../../backend/features/client-compatibility';
import { showClientCompatibilityWidget } from '../../../backend/features/client-compatibility/services/show-client-compatibility-widget';

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
  void logout();
}

ipcMain.on('user-logged-out', closeUserSession);

eventBus.on('APP_IS_READY', async (): Promise<void> => {
  initializeLoginState();

  /**
   * v2.7.1 Alexis Mora
   * A version the backend rejects must not start any feature. Local files stay as they are and
   * the next launch after updating starts them normally.
   */
  if (isLoggedIn && isClientUnsupported()) {
    logger.warn({ tag: 'AUTH', msg: 'Features not started because this client version is no longer supported' });
    await showClientCompatibilityWidget();
    return;
  }

  if (isLoggedIn) {
    await createTokenScheduleWithRetry();
    eventBus.emit('USER_LOGGED_IN');
  }
});
