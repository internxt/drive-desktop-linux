import Logger from 'electron-log';
import {
  installNautilusExtension,
  reloadNautilus,
  uninstallNautilusExtension,
} from './install';

async function reload() {
  await uninstallNautilusExtension();
  await installNautilusExtension();
  await reloadNautilus();
}

reload()
  .then(() => {
    Logger.info('Nautilus extension reloaded');
  })
  .catch((err) => {
    Logger.error(err);
  });
