import Logger from 'electron-log';
import {
  installNautilusExtension,
  uninstallNautilusExtension,
} from './install';

async function reload() {
  await uninstallNautilusExtension();
  await installNautilusExtension();
}

reload()
  .then(() => {
    Logger.info('Nautilus extension reloaded');
  })
  .catch((err) => {
    Logger.error(err);
  });
