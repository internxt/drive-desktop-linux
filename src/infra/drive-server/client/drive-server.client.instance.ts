import { paths } from '../../schemas';
import { getNewApiHeaders } from '../../../apps/main/auth/service';
import { closeUserSession } from '../../../apps/main/auth/handlers';
import { createClient } from '../drive-server.client';
import { ClientOptions } from '../drive-server.types';

const clientOptions: ClientOptions = {
  baseUrl: process.env.NEW_DRIVE_URL || '',
  authHeadersProvider: getNewApiHeaders,
  onUnauthorized: closeUserSession,
};

export const driveServerClient = createClient<paths>(clientOptions);
