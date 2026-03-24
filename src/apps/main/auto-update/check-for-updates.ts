import { autoUpdater } from 'electron-updater';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { checkForUpdatesOnGithub } from '../../../core/auto-update/check-for-updates-on-github';

type Props = {
  currentVersion: string;
  onUpdateAvailable: (updateInfo: { version: string }) => void;
};

export async function checkForUpdates({ currentVersion, onUpdateAvailable }: Props): Promise<void> {
  if (!process.env.APPIMAGE) {
    const updateInfo = await checkForUpdatesOnGithub({ currentVersion });
    if (updateInfo) {
      onUpdateAvailable(updateInfo);
    }
    return;
  }

  try {
    autoUpdater.logger = {
      debug: (msg) => logger.debug({ msg: `AutoUpdater: ${msg}` }),
      info: (msg) => logger.debug({ msg: `AutoUpdater: ${msg}` }),
      error: (msg) => logger.error({ msg: `AutoUpdater: ${msg}` }),
      warn: (msg) => logger.warn({ msg: `AutoUpdater: ${msg}` }),
    };
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err: unknown) {
    logger.error({ msg: 'AutoUpdater Error:', err });
  }
}
