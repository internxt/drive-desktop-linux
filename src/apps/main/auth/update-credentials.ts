import { safeStorage } from 'electron';

import ConfigStore from '../config';
import { User } from '../types';

const TOKEN_ENCODING = 'latin1';

function encryptKey({ key }: { key: string }) {
  const buffer = safeStorage.encryptString(key);
  return buffer.toString(TOKEN_ENCODING);
}

type GetMnemonicStringParams = {
  isSafeStorageAvailable: boolean;
  mnemonic?: string;
};

function getMnemonicString({ isSafeStorageAvailable, mnemonic }: GetMnemonicStringParams) {
  if (!mnemonic) return ConfigStore.get('mnemonic');
  return isSafeStorageAvailable ? encryptKey({ key: mnemonic }) : mnemonic;
}

type Props = {
  newToken: string;
  mnemonic?: string;
  userData?: User;
};

export async function updateCredentials({ newToken, mnemonic, userData }: Props) {
  const isSafeStorageAvailable = safeStorage.isEncryptionAvailable();

  const token = isSafeStorageAvailable ? encryptKey({ key: newToken }) : newToken;
  const mnemonicString = getMnemonicString({ isSafeStorageAvailable, mnemonic });

  ConfigStore.set('newToken', token);
  ConfigStore.set('newTokenEncrypted', isSafeStorageAvailable);
  ConfigStore.set('mnemonic', mnemonicString);
  ConfigStore.set('mnemonicEncrypted', isSafeStorageAvailable);
  if (userData) ConfigStore.set('userData', userData);
}
