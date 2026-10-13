import type { MailBridgeClientCredentials } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { getMailBridgeCredentialsFromStore } from './get-mail-bridge-credentials-from-store';
import { mapStoredMailBridgeCredentials } from './mappers/map-stored-mail-bridge-credentials';
import { decryptMailBridgeCredentials } from './utils/decrypt-mail-bridge-credentials';

/**
 * Reads the current account's encrypted credentials, decrypts their JSON payload,
 * and validates the username and password before returning them.
 *
 * @returns Validated credentials, undefined when none are stored, or a storage,
 * decryption, or validation error. Missing credentials allow the caller to create new ones.
 */
export function retrieveMailBridgeCredentials(): Result<MailBridgeClientCredentials | undefined, Error> {
  const { data: encryptedCredentials, error: storeError } = getMailBridgeCredentialsFromStore();
  if (storeError) {
    return Result.err(storeError);
  }
  if (!encryptedCredentials) {
    return Result.ok(undefined);
  }

  const { data: credentials, error: decryptError } = decryptMailBridgeCredentials(encryptedCredentials);
  if (decryptError) {
    return Result.err(decryptError);
  }
  return mapStoredMailBridgeCredentials(credentials);
}
