import { ipcMain } from 'electron';
import { openHttpsUrl } from './open-https-url';

ipcMain.handle('open-url', (_, url: string) => {
  return openHttpsUrl({ url });
});
