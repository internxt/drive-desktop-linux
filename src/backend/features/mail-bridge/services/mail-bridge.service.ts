import {
  createMailBridgeService,
  createMailBridgeSession,
  getMailBridgeEmail as getCoreMailBridgeEmail,
  MailBridgeSessionPreparationError,
  type MailBridgeConnectionSettings,
} from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { getCredentials } from '../../../../apps/main/auth/get-credentials';
import { getUser } from '../../auth/user-session';
import { getMailBridgeClientConfig } from '../config/get-mail-bridge-client-config';
import { isMailBridgeStartOnLoginEnabled } from '../config/is-mail-bridge-start-on-login-enabled';
import { mailBridgeCredentialsStore } from '../config/mail-bridge-credentials-store';
import { linuxMailBridgePlatform } from './mail-bridge-platform';

const bridge = createMailBridgeService(linuxMailBridgePlatform);

export const {
  getMailBridgeStatus,
  getMailBridgeSyncProgress,
  subscribeToMailBridgeStatus,
  subscribeToMailBridgeSyncProgress,
  resyncMailBridge,
  updateMailBridgeAccessToken,
} = bridge;

/** Prepares and starts the current account, discarding preparation if the signed-in account changes. */
export async function startMailBridge(): Promise<Result<MailBridgeConnectionSettings, Error & { code: string }>> {
  const user = getUser();
  if (!user) {
    return Result.err({ name: 'Error', code: 'not-authenticated', message: 'Please log in to start Mail Bridge' });
  }

  const { newToken, mnemonic } = getCredentials();
  const session = await createMailBridgeSession({
    accountId: user.uuid,
    email: user.email,
    mnemonic,
    clientConfig: getMailBridgeClientConfig(newToken),
    credentialsStore: mailBridgeCredentialsStore,
  });
  /**
   * v2.7.0 Alexis Mora
   * Session preparation awaits the Mail API.
   * There can be corner case where the user may log out or switch accounts before it completes.
   * we need to recheck the account to avoid starting the previous account's bridge after logout cleanup has finished.
   */
  if (getUser()?.uuid !== user.uuid) {
    return Result.err({ name: 'Error', code: 'session-changed', message: 'Mail Bridge session was cancelled' });
  }
  if (session.error) {
    const code =
      session.error instanceof MailBridgeSessionPreparationError ? session.error.code : 'session-creation-failed';
    logger.error({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge session could not be prepared', code, error: session.error });
    return Result.err({ name: session.error.name, code, message: session.error.message });
  }

  const started = await bridge.startMailBridge(session.data);
  return Result.mapError(started, (error) => ({
    name: error.name,
    code: 'start-failed',
    message: error.message,
  }));
}

export async function startMailBridgeOnLogin(): Promise<void> {
  if (isMailBridgeStartOnLoginEnabled()) {
    const result = await startMailBridge();
    if (result.error) {
      logger.warn({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge could not start automatically', code: result.error.code });
    }
  }
}

/** Stops the running or starting Mail Bridge process through core. */
export async function stopMailBridge(): Promise<Result<undefined, Error>> {
  const result = await bridge.stopMailBridge();
  if (result.error) logger.error({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge stop request failed', error: result.error });
  return result;
}

export function getMailBridgeEmail(): ReturnType<typeof getCoreMailBridgeEmail> {
  const { newToken } = getCredentials();
  return getCoreMailBridgeEmail(getMailBridgeClientConfig(newToken));
}
