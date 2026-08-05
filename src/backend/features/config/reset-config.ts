import ConfigStore, { defaults, fieldsToSave } from '../../../apps/main/config';
import eventBus from '../../../apps/main/event-bus';

const keepFields = new Set<keyof typeof defaults>(['preferedLanguage', 'lastOnboardingShown']);

export function resetConfig() {
  for (const field of fieldsToSave) {
    if (!keepFields.has(field)) {
      ConfigStore.set(field, defaults[field]);
    }
  }

  ConfigStore.delete('availableUserProducts');
  eventBus.emit('USER_AVAILABLE_PRODUCTS_UPDATED', undefined);

  resetCredentials();
}

function resetCredentials() {
  for (const field of ['mnemonic', 'mnemonicEncrypted', 'userData', 'newToken', 'newTokenEncrypted'] as const) {
    ConfigStore.set(field, defaults[field]);
  }
}
