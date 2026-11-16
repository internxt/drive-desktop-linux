import { logger } from '@internxt/drive-desktop-core/build/backend';
import { copyExtensionFile, deleteExtensionFile, isInstalled, reloadFileManager, getFileManagerType } from './service';
import { detectAvailableFileManager } from './detect-available';

import configStore from '../../../apps/main/config';
import { LATEST_EXTENSION_VERSION } from './version';

function isUpToDate(): boolean {
  const extVersion = configStore.get('fileManagerExtensionVersion');

  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  return extVersion >= LATEST_EXTENSION_VERSION;
}

type InstallProps = {
  overwrite?: boolean;
};

async function install({ overwrite = false }: InstallProps = {}) {
  await copyExtensionFile({ overwrite });

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
      await install({ overwrite: true });
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
