import { safeStorage } from 'electron';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import electronStore from '../../../apps/main/config';

/**
 * Reads the encrypted Mail Bridge credentials for the current account.
 * Returns undefined when none are stored, or an error when secure storage is
 * unavailable. Decryption is handled by the caller.
 */
export function getMailBridgeCredentialsFromStore(): Result<string | undefined, Error> {
  const encrypted = electronStore.get('mailBridgeCredentials');
  if (!encrypted) {
    return Result.ok(undefined);
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return Result.err(new Error('Secure credential storage is unavailable'));
  }
  return Result.ok(encrypted);
}
