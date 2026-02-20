import { logger } from '@internxt/drive-desktop-core/build/backend';

import packageConfig from '../../../../package.json';
import ConfigStore, { defaults, fieldsToSave } from '../config';
import { User } from '../types';
import { driveServerModule } from '../../../infra/drive-server/drive-server.module';
import { getCredentials } from './get-credentials';

export function getUser(): User | null {
  const user = ConfigStore.get('userData');

  return user && Object.keys(user).length ? user : null;
}

const keepFields: Array<keyof typeof defaults> = ['preferedLanguage', 'lastOnboardingShown'];

function resetConfig() {
  for (const field of fieldsToSave) {
    if (!keepFields.includes(field)) {
      ConfigStore.set(field, defaults[field]);
    }
  }
}

function saveConfig({ uuid }: { uuid: string }) {
  const savedConfigs = ConfigStore.get('savedConfigs');

  const configToSave = Object.fromEntries(fieldsToSave.map((field) => [field, ConfigStore.get(field)]));

  ConfigStore.set('savedConfigs', {
    ...savedConfigs,
    [uuid]: configToSave,
  });
}

export function getBaseApiHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json; charset=utf-8',
    'internxt-client': 'drive-desktop-linux',
    'internxt-version': packageConfig.version,
    'x-internxt-desktop-header': process.env.INTERNXT_DESKTOP_HEADER_KEY || '',
  };
}

export function getNewApiHeaders(): Record<string, string> {
  const { newToken } = getCredentials();

  return {
    Authorization: `Bearer ${newToken}`,
    ...getBaseApiHeaders(),
  };
}

function resetCredentials() {
  for (const field of ['mnemonic', 'mnemonicEncrypted', 'userData', 'newToken', 'newTokenEncrypted'] as const) {
    ConfigStore.set(field, defaults[field]);
  }
}

export function canHisConfigBeRestored({ uuid }: { uuid: string }) {
  const savedConfigs = ConfigStore.get('savedConfigs');

  if (!savedConfigs) return false;
  const savedConfig = savedConfigs[uuid];

  if (!savedConfig) {
    return false;
  }

  for (const [key, value] of Object.entries(savedConfig)) {
    ConfigStore.set(key, value);
  }

  return true;
}

export function logout() {
  logger.debug({ msg: 'Logging out' });

  const user = getUser();
  if (!user) return;

  const { uuid } = user;

  saveConfig({ uuid });
  resetConfig();
  resetCredentials();
  void driveServerModule.auth.logout();
  logger.debug({ msg: '[AUTH] User logged out' });
}
