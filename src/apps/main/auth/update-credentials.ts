import { safeStorage } from 'electron';

import ConfigStore from '../config';
import { User } from '../types';
import { Delay } from '../../shared/Delay';

const TOKEN_ENCODING = 'latin1';

function encryptKey({ key }: { key: string }) {
  const buffer = safeStorage.encryptString(key);
  return buffer.toString(TOKEN_ENCODING);
}

type Props = {
  newToken: string;
  mnemonic?: string;
  userData?: User;
};

export async function updateCredentials({ newToken, mnemonic, userData }: Props) {
  // In the version of electron we are using calling
  // isEncryptionAvailable or decryptString "too son" will crash the app
  // we will be able to remove once we can update the electron version
  await Delay.ms(1_000);

  const isSafeStorageAvailable = safeStorage.isEncryptionAvailable();

  const token = isSafeStorageAvailable ? encryptKey({ key: newToken }) : newToken;

  function getMnemonicString() {
    if (!mnemonic) return ConfigStore.get('mnemonic');
    return isSafeStorageAvailable ? encryptKey({ key: mnemonic }) : mnemonic;
  };
  const mnemonicString = getMnemonicString();

  ConfigStore.set('newToken', token);
  ConfigStore.set('newTokenEncrypted', isSafeStorageAvailable);
  ConfigStore.set('mnemonic', mnemonicString);
  ConfigStore.set('mnemonicEncrypted', isSafeStorageAvailable);
  if (userData) ConfigStore.set('userData', userData);
}
