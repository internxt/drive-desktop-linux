import { logger } from '@internxt/drive-desktop-core/build/backend';
import ConfigStore, { defaults, fieldsToSave } from '../config';
import { driveServerModule } from '../../../infra/drive-server/drive-server.module';
import { saveConfig } from '../config/save-config';
import eventBus from '../event-bus';
import { closeUserSessionResources } from './close-user-session-resources';
import { getUser } from './user-session';

const keepFields = new Set<keyof typeof defaults>(['preferedLanguage', 'lastOnboardingShown']);
let logoutInFlight: Promise<void> | null = null;

function resetConfig() {
  for (const field of fieldsToSave) {
    if (!keepFields.has(field)) {
      ConfigStore.set(field, defaults[field]);
    }
  }

  ConfigStore.delete('availableUserProducts');
  eventBus.emit('USER_AVAILABLE_PRODUCTS_UPDATED', undefined);
}

function resetCredentials() {
  for (const field of ['mnemonic', 'mnemonicEncrypted', 'userData', 'newToken', 'newTokenEncrypted'] as const) {
    ConfigStore.set(field, defaults[field]);
  }
}

async function executeLogout() {
  logger.debug({ msg: 'Logging out' });

  const user = getUser();

  if (user) {
    const { uuid } = user;

    saveConfig({ uuid });
  }

  await closeUserSessionResources();
  eventBus.emit('USER_LOGGED_OUT');

  if (user) {
    void driveServerModule.auth.logout();
  }

  resetConfig();
  resetCredentials();
  logger.debug({ msg: '[AUTH] User logged out' });
}

export async function logout() {
  if (logoutInFlight) {
    await logoutInFlight;
    return;
  }

  logoutInFlight = executeLogout();

  try {
    await logoutInFlight;
  } finally {
    logoutInFlight = null;
  }
}

export async function waitForLogoutToFinish() {
  if (!logoutInFlight) {
    return;
  }

  await logoutInFlight;
}
