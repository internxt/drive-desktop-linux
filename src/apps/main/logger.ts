import { ipcMain, shell } from 'electron';
import log from 'electron-log';
import path from 'node:path';

ipcMain.on('open-logs', () => {
  const logfilePath = log.transports.file.getFile().path;
  const logFolderPath = path.dirname(logfilePath);
  shell.openPath(logFolderPath);
});

export default log;
