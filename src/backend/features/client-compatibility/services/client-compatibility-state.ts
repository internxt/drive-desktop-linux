import {
  ClientCompatibilityState,
  isClientVersionUnsupported,
  logger,
} from '@internxt/drive-desktop-core/build/backend';
import eventBus from '../../../../apps/main/event-bus';

let state: ClientCompatibilityState = { status: 'up_to_date' };

export function getClientCompatibility() {
  return state;
}

export function isClientUnsupported() {
  return isClientVersionUnsupported(state);
}

/**
 * v2.7.1 Alexis Mora
 * Once unsupported, the state does not change again for the rest of the session: the running version cannot
 * change without restarting the app, and the next launch checks the backend again.
 * The side effects run from an event so the HTTP client can update the state without importing every feature.
 */
export function setClientCompatibility({ state: next }: { state: ClientCompatibilityState }) {
  if (isClientUnsupported()) return;

  logger.debug({ msg: 'Client compatibility', status: next.status });
  state = next;

  if (state.status !== 'up_to_date') eventBus.emit('CLIENT_COMPATIBILITY_CHANGED', state);
}
