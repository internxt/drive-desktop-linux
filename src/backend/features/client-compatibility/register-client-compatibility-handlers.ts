import { ClientCompatibilityState } from '@internxt/drive-desktop-core/build/backend';
import eventBus from '../../../apps/main/event-bus';
import { broadcastToWindows } from '../../../apps/main/windows';
import { haltFeatures } from './services/halt-features';
import { showClientCompatibilityNotification } from './services/show-client-compatibility-notification';

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
}
