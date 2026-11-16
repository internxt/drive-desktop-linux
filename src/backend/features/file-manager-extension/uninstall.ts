import { logger } from '@internxt/drive-desktop-core/build/backend';
import { deleteExtensionFile, isInstalled, reloadFileManager } from './service';

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
