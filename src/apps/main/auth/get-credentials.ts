import { safeStorage } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import ConfigStore from '../config';

const TOKEN_ENCODING = 'latin1';

export function getCredentials() {
  const newToken = ConfigStore.get('newToken');
  const mnemonic = ConfigStore.get('mnemonic');
  const mnemonicEncrypted = ConfigStore.get('mnemonicEncrypted');
  const tokenEncrypted = ConfigStore.get('newTokenEncrypted');

  if (!tokenEncrypted && !mnemonicEncrypted) {
    return { newToken, mnemonic };
  }

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.error({
        msg: '[AUTH] Safe Storage was not available when decrypting encrypted token',
        tag: 'AUTH',
      });
      return { newToken, mnemonic };
    }

    const decryptedToken = tokenEncrypted ? safeStorage.decryptString(Buffer.from(newToken, TOKEN_ENCODING)) : newToken;

    const decryptedMnemonic = mnemonicEncrypted
      ? safeStorage.decryptString(Buffer.from(mnemonic, TOKEN_ENCODING))
      : mnemonic;

    return {
      newToken: decryptedToken,
      mnemonic: decryptedMnemonic,
    };
  } catch (err) {
    throw logger.error({
      msg: '[AUTH] Failed to decrypt token',
      tag: 'AUTH',
      error: err,
    });
  }
}
