import { getMailBridgeEnvironment } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';

/** Explicit references let dotenv-webpack embed Mail settings in packaged builds. */
export function getMailBridgeProcessEnvironment(): Result<NodeJS.ProcessEnv, Error> {
  return getMailBridgeEnvironment({
    inheritedEnvironment: process.env,
    mailApiUrl: process.env.MAIL_API_URL,
    mailServerPublicKey: process.env.MAIL_SERVER_PUBLIC_KEY,
  });
}
