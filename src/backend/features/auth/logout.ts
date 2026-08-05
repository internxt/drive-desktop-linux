import { logger } from '@internxt/drive-desktop-core/build/backend';
import { driveServerModule } from '../../../infra/drive-server/drive-server.module';
import { saveConfig } from '../../../apps/main/config/save-config';
import eventBus from '../../../apps/main/event-bus';
import { closeUserSessionResources } from '../../../apps/main/auth/close-user-session-resources';
import { getUser } from './user-session';
import { resetConfig } from '../config/reset-config';

export async function logout() {
  logger.debug({ msg: 'Logging out' });

  const user = getUser();

  if (user) {
    const { uuid } = user;

    saveConfig({ uuid });
  }

  await closeUserSessionResources();
  eventBus.emit('USER_LOGGED_OUT');

  if (user) {
    void driveServerModule.auth.logout();
  }

  resetConfig();
  logger.debug({ msg: '[AUTH] User logged out' });
}
