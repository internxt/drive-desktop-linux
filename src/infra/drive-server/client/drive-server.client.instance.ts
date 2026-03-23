import { paths } from '../../schemas';
import { getNewApiHeaders, logout } from '../../../apps/main/auth/service';
import { createClient } from '../drive-server.client';
import { ClientOptions } from '../drive-server.types';

const clientOptions: ClientOptions = {
  baseUrl: process.env.NEW_DRIVE_URL || '',
  authHeadersProvider: getNewApiHeaders,
  onUnauthorized: logout,
};

export const driveServerClient = createClient<paths>(clientOptions);
