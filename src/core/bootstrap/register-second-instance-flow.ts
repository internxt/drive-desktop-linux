import { app } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { handleDeeplink } from '../../apps/main/auth/deeplink/handle-deeplink';
import { getIsLoggedIn } from '../../apps/main/auth/handlers';
import { createAuthWindow, getAuthWindow } from '../../apps/main/windows/auth';
import { getOrCreateWidged } from '../../apps/main/windows/widget';

export function registerSecondInstanceFlow() {
  app.on('second-instance', async (_, argv) => {
    logger.debug({ tag: 'AUTH', msg: 'Deeplink received on second instance, processing...' });
    const deeplinkArg = argv.find((arg) => arg.startsWith('internxt://'));
    if (!deeplinkArg) {
      return;
    }

    try {
      await handleDeeplink({ url: deeplinkArg });
    } catch (error) {
      logger.error({ tag: 'AUTH', msg: 'Error handling deeplink', error });
    }
  });
}
