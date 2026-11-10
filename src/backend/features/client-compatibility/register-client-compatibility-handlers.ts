import { ClientCompatibilityState } from '@internxt/drive-desktop-core/build/backend';
import { ipcMain } from 'electron';
import eventBus from '../../../apps/main/event-bus';
import { broadcastToWindows } from '../../../apps/main/windows';
import { haltFeatures } from './services/halt-features';
import { showClientCompatibilityNotification } from './services/show-client-compatibility-notification';
import { getClientCompatibility } from './services/client-compatibility-state';
import { updateApp } from './services/update-app';

let isNotificationShown = false;

/**
 * v2.7.1 Alexis Mora
 * The native notification is shown only once per session, whether it comes from startup or from a rejected request.
 */
function onClientCompatibilityChanged(state: ClientCompatibilityState) {
  broadcastToWindows('client-compatibility-changed', state);

  if (state.status === 'unsupported') void haltFeatures();

  if (!isNotificationShown) {
    isNotificationShown = true;
    showClientCompatibilityNotification({ state });
  }
}

export function registerClientCompatibilityHandlers() {
  eventBus.on('CLIENT_COMPATIBILITY_CHANGED', onClientCompatibilityChanged);
  ipcMain.handle('get-client-compatibility', getClientCompatibility);
  ipcMain.handle('update-app', updateApp);
}
