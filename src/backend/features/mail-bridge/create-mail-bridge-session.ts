import {
  createMailClient,
  prepareMailBridgeSession,
  type MailBridgeSession,
} from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { getCredentials } from '../../../apps/main/auth/get-credentials';
import type { User } from '../../../apps/main/types';
import { appInfo } from '../../../apps/main/app-info/app-info';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getOrCreateMailBridgeCredentials } from './get-or-create-mail-bridge-credentials';

/**
 * Prepares the secret session payload used to initialize the Mail Bridge process.
 * Retrieves or creates encrypted local mail-client credentials,
 * then uses the current access token to fetch Mail account keys through the shared core client.
 *
 * The core unlocks the Mail encryption keystore with the stored mnemonic and combines the keys,
 * account address, token, and client credentials into a session.
 *
 * @param user - The signed-in account whose Mail session should be prepared.
 * @returns A session on success, or a credential/API/key-unlock error on failure.
 * Core preparation errors retain their codes so callers can handle missing mailboxes.
 * The returned session contains secrets and must not be logged.
 */
export async function createMailBridgeSession(user: User): Promise<Result<MailBridgeSession, Error>> {
  logger.debug({ tag: 'MAIL-BRIDGE', msg: 'Preparing Mail Bridge session' });
  const { data: credentials, error } = getOrCreateMailBridgeCredentials(user);
  if (error) {
    logger.error({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge credentials could not be prepared', error });
    return Result.err(error);
  }

  try {
    const { newToken: token, mnemonic } = getCredentials();
    const mailClient = createMailClient({
      gatewayUrl: process.env.NEW_DRIVE_URL,
      clientName: appInfo.name,
      clientVersion: appInfo.version,
      desktopHeader: process.env.INTERNXT_DESKTOP_HEADER_KEY,
      token,
    });
    const result = await prepareMailBridgeSession({
      accountId: user.uuid,
      token,
      mnemonic,
      mailClient: credentials,
      getMailAccountKeys: mailClient.getMailAccountKeys,
    });
    if (result.error) {
      logger.error({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge session preparation failed', error: result.error });
      return Result.err(result.error);
    }
    logger.debug({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge session prepared' });
    return Result.ok(result.data);
  } catch (error) {
    const sessionError = error instanceof Error ? error : new Error(String(error));
    logger.error({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge session preparation threw', error: sessionError });
    return Result.err(sessionError);
  }
}
