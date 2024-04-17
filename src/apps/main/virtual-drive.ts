import { install } from './nautilus-extension/install';
import Logger from 'electron-log';
import * as Sentry from '@sentry/electron/main';

if (process.platform === 'linux') {
  import('../fuse/index');
}

install()
  .then(() => {
    Logger.debug('Extension Installed');
  })
  .catch((err) => {
    Logger.error(err);
    Sentry.captureException(err);
  });
