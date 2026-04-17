import { app } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import eventBus from '../event-bus';
import { getIsLoggedIn } from '../auth/handlers';
import { createAuthWindow } from '../windows/auth';
import { setTrayStatus } from '../tray/tray';
import { broadcastToWindows } from '../windows';
import { setupThemeListener } from '../../../core/theme';
import { registerAvailableUserProductsHandlers } from '../../../backend/features/payments/ipc/register-available-user-products-handlers';
import { setupAppImageDeeplink } from '../auth/deeplink/setup-appimage-deeplink';
import { INTERNXT_VERSION } from '../../../core/utils/utils';
import { checkForUpdates } from '../auto-update/check-for-updates';
import { setPendingUpdateInfo } from './bootstrap-runtime-state';

export function registerAppReadyFlow() {
  app
    .whenReady()
    .then(async () => {
      /**
       * v.2.5.1
       * Esteban Galvis Triana
       * .AppImage users may experience login issues because the deeplink protocol
       * is not registered automatically, unlike with .deb packages.
       * This function manually registers the protocol handler for .AppImage installations.
       */
      await setupAppImageDeeplink();
      /**
       * TODO: Nautilus extension disabled temporarily
       * v.2.5.4
       * Esteban Galvis Triana
       * The Nautilus extension will be temporarily disabled
       * while the exact behavior of the context menu options is being determined.
       */
      // await installNautilusExtension();
      setupThemeListener();

      eventBus.emit('APP_IS_READY');
      const isLoggedIn = getIsLoggedIn();

      if (!isLoggedIn) {
        await createAuthWindow();
        setTrayStatus('IDLE');
      }

      await checkForUpdates({
        currentVersion: INTERNXT_VERSION,
        onUpdateAvailable: (updateInfo) => {
          setPendingUpdateInfo(updateInfo);
          broadcastToWindows('update-available', updateInfo);
        },
      });
      registerAvailableUserProductsHandlers();
    })
    .catch((exc) => logger.error({ msg: 'Error starting app', exc }));
}
