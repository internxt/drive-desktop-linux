import type { User } from '../../../apps/main/types';
import type { MailBridgeClientCredentials } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { retrieveMailBridgeCredentials } from './retrieve-mail-bridge-credentials';
import { storeCredentials } from './store-credentials';
import { generateRandomPassword } from './utils/generate-random-password';

export function getOrCreateMailBridgeCredentials(user: User) {
  const { data: stored, error } = retrieveMailBridgeCredentials();
  if (error) return { data: undefined, error };
  if (stored) {
    return { data: stored, error: undefined };
  }

  return createMailBridgeCredentials(user);
}


function createMailBridgeCredentials(user: User) {
  const credentials: MailBridgeClientCredentials = { username: user.email, password: generateRandomPassword() };
  const { error } = storeCredentials(credentials);
  if (error) return { error, data: undefined };

  return { data: credentials, error: undefined };
}
