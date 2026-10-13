import { safeStorage } from 'electron';
import type { MailBridgeClientCredentials } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';

/**
 * Serializes the local mail-client credentials as JSON, encrypts them with
 * Electron safe storage, and encodes the encrypted payload as base64 for storage.
 *
 * @param credentials - The username and password used by local mail clients.
 * @returns The encrypted base64 payload, or a secure-storage or encryption error.
 */
export function encryptMailBridgeCredentials(credentials: MailBridgeClientCredentials): Result<string, Error> {
  if (!safeStorage.isEncryptionAvailable()) {
    return Result.err(new Error('Secure credential storage is unavailable'));
  }

  try {
    return Result.ok(safeStorage.encryptString(JSON.stringify(credentials)).toString('base64'));
  } catch (error) {
    return Result.err(new Error('Could not encrypt Mail Bridge credentials', { cause: error }));
  }
}
