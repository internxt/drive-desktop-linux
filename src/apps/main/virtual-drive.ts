import { installNautilusExtension } from '../nautilus-extension/install';
import Logger from 'electron-log';
import * as Sentry from '@sentry/electron/main';

if (process.platform === 'linux') {
  import('../fuse/index');
}

installNautilusExtension()
  .then(() => {
    Logger.info('[Nautilus Extension] Extension Installed');
  })
  .catch((err) => {
    Logger.error(err);
    Sentry.captureException(err);
  });
