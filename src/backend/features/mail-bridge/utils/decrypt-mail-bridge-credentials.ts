import { safeStorage } from 'electron';
import { Result } from '@internxt/drive-desktop-core/build/common/result';

/**
 * Decodes the stored base64 payload, decrypts it with Electron safe storage,
 * and parses the credentials JSON. The parsed value remains unknown until
 * mapStoredMailBridgeCredentials validates its structure.
 *
 * @param encryptedCredentials - The base64-encoded encrypted credentials.
 * @returns Parsed data, or a secure-storage, decryption, or JSON parsing error.
 */
export function decryptMailBridgeCredentials(encryptedCredentials: string): Result<unknown, Error> {
  if (!safeStorage.isEncryptionAvailable()) {
    return Result.err(new Error('Secure credential storage is unavailable'));
  }

  try {
    const parsed: unknown = JSON.parse(safeStorage.decryptString(Buffer.from(encryptedCredentials, 'base64')));
    return Result.ok(parsed);
  } catch (error) {
    return Result.err(new Error('Could not decrypt Mail Bridge credentials', { cause: error }));
  }
}
