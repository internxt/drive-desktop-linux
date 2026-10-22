import { safeStorage } from 'electron';

import ConfigStore from '../config';
import { UserDto } from '../../../infra/drive-server/out/dto';

import { updateMailBridgeAccessToken } from '../../../backend/features/mail-bridge';
import { logger } from '@internxt/drive-desktop-core/build/backend';

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
  userData?: UserDto;
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

  const bridgeUpdate = await updateMailBridgeAccessToken({ token: newToken });
  if (bridgeUpdate.error) {
    logger.warn({ tag: 'AUTH', msg: 'Could not refresh Mail Bridge access token', error: bridgeUpdate.error });
  }
}
