import { paths } from '@internxt/drive-desktop-core/build/backend';
import { createClient } from '../../drive-server.client';
import { INTERNXT_CLIENT, INTERNXT_VERSION } from '../../../../core/utils/utils';

const CLIENT_COMPATIBILITY_TIMEOUT_MS = 10 * 1000;

const compatibilityClient = createClient<paths>({ baseUrl: process.env.NEW_DRIVE_URL || '' });

/**
 * v2.7.1 Alexis Mora
 * This check is awaited before the app starts and needs no session, so it goes through its own client without
 * auth and with a timeout: an offline launch must not hang, and a failed check does not block the client anyway.
 */
export function getClientCompatibility() {
  return compatibilityClient.GET('/clients/compatibility', {
    headers: { 'internxt-client': INTERNXT_CLIENT, 'internxt-version': INTERNXT_VERSION },
    signal: AbortSignal.timeout(CLIENT_COMPATIBILITY_TIMEOUT_MS),
  });
}
