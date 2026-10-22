import type { MailBridgeCredentialsStore } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import configStore from '../../../../apps/main/config';

/** Config is scoped to the current account */
export const mailBridgeCredentialsStore: MailBridgeCredentialsStore = {
  read: () => {
    try {
      return Result.ok(configStore.get('mailBridgeCredentials') || undefined);
    } catch (error) {
      return Result.err(new Error('Could not read Mail Bridge credentials', { cause: error }));
    }
  },
  write: (encryptedCredentials) => configStore.set('mailBridgeCredentials', encryptedCredentials),
};
