import * as Sentry from '@sentry/electron/main';
import Logger from 'electron-log';
import {
  copyNautilusExtensionFile,
  deleteNautilusExtensionFile,
  isInstalled,
  reloadNautilus,
} from './service';

import configStore from '../config';
import { LATEST_NAUTILUS_EXTENSION_VERSION } from './version';

function isUpToDate(): boolean {
  const nautilusExtensionInstalledAt = configStore.get(
    'nautilusExtensionVersion'
  );

  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  return nautilusExtensionInstalledAt >= LATEST_NAUTILUS_EXTENSION_VERSION;
}

async function install(): Promise<void> {
  await copyNautilusExtensionFile();

  configStore.set(
    'nautilusExtensionVersion',
    LATEST_NAUTILUS_EXTENSION_VERSION
  );

  Logger.info(
    '[NAUTILUS EXTENSION] Extension Installed with version #',
    LATEST_NAUTILUS_EXTENSION_VERSION
  );
}

export async function installNautilusExtension() {
  try {
    const installed = await isInstalled();
    const hasLatestsVersion = isUpToDate();

    if (!installed) {
      await install();
      await reloadNautilus().catch((reloadError) => {
        Logger.error(reloadError);
        Sentry.captureException(reloadError);
      });
      return;
    }

    if (installed && !hasLatestsVersion) {
      Logger.info(
        '[NAUTILUS EXTENSION] There is a newer version to be installed'
      );
      await deleteNautilusExtensionFile();
      await install();

      return;
    }

    Logger.info(
      '[NAUTILUS EXTENSION] Extension already installed with the version'
    );
  } catch (error) {
    Logger.error(error);
    Sentry.captureException(error);
  }
}
