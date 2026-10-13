import type { MailBridgeClientCredentials } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';

/**
 * Validates the parsed, decrypted credentials before they are used by the bridge.
 * Requires an object with string username and password fields.
 *
 * @param value - The unvalidated value parsed from the stored credentials JSON.
 * @returns Typed mail-client credentials, or an error when their structure is invalid.
 */
export function mapStoredMailBridgeCredentials(value: unknown): Result<MailBridgeClientCredentials, Error> {
  if (!isStoredCredentials(value)) {
    return Result.err(new Error('Stored Mail Bridge credentials are invalid'));
  }

  return Result.ok(value);
}

function isStoredCredentials(value: unknown): value is MailBridgeClientCredentials {
  if (typeof value !== 'object' || value === null) return false;

  const credentials = value as Partial<MailBridgeClientCredentials>;
  if (typeof credentials.username !== 'string' || typeof credentials.password !== 'string') return false;

  return true;
}
