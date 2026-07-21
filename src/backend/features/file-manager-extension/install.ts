import { logger } from '@internxt/drive-desktop-core/build/backend';
import { copyExtensionFile, deleteExtensionFile, isInstalled, reloadFileManager, getFileManagerType } from './service';
import { detectAvailableFileManager } from './detect-available';

import configStore from '../../../apps/main/config';
import { LATEST_EXTENSION_VERSION } from './version';

function isUpToDate(): boolean {
  const extensionInstalledAt = configStore.get('fileManagerExtensionVersion');

  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  return extensionInstalledAt >= LATEST_EXTENSION_VERSION;
}

async function install(): Promise<void> {
  await copyExtensionFile();

  configStore.set('fileManagerExtensionVersion', LATEST_EXTENSION_VERSION);

  const fileManager = await getFileManagerType();

  logger.debug({
    msg: `[FILE_MANAGER_EXTENSION] Extension Installed with version #${LATEST_EXTENSION_VERSION} for ${fileManager}`,
  });
}

export async function installFileManagerExtension() {
  try {
    const fileManager = await detectAvailableFileManager();

    if (!fileManager) {
      logger.debug({
        msg: '[FILE_MANAGER_EXTENSION] No compatible file manager found (Nautilus, Nemo or Dolphin)',
      });
      return;
    }

    logger.debug({
      msg: `[FILE_MANAGER_EXTENSION] Detected file manager: ${fileManager}`,
    });

    const installed = await isInstalled();
    const hasLatestVersion = isUpToDate();

    if (!installed) {
      await install();
      await reloadFileManager().catch((reloadError) => {
        logger.error({
          msg: 'Caught error while reloading file manager extension',
          error: reloadError,
        });
      });
      return;
    }

    if (installed && !hasLatestVersion) {
      logger.debug({
        msg: '[FILE_MANAGER_EXTENSION] There is a newer version to be installed',
      });

      await deleteExtensionFile();
      await install();
      await reloadFileManager().catch((reloadError) => {
        logger.error({
          msg: 'Caught error while reloading file manager extension',
          error: reloadError,
        });
      });
    }
  } catch (error) {
    logger.error({
      msg: '[FILE_MANAGER_EXTENSION] Installation failed',
      error,
    });
  }
}

export async function uninstallFileManagerExtension() {
  try {
    const installed = await isInstalled();

    if (!installed) {
      return;
    }

    await deleteExtensionFile();
    await reloadFileManager().catch((error) => {
      logger.error({
        msg: 'Caught error while reloading file manager extension',
        error,
      });
    });
  } catch (error) {
    logger.error({
      msg: '[FILE_MANAGER_EXTENSION] Uninstallation failed',
      error,
    });
  }
}
