import { app } from 'electron';
import path, { join } from 'node:path';
import os from 'node:os';

const HOME_FOLDER_PATH = app.getPath('home');
const APP_DATA_PATH = app.getPath('appData');
const INTERNXT = join(APP_DATA_PATH, 'internxt-drive');
const LOGS = join(HOME_FOLDER_PATH, '.config', 'internxt', 'logs');
const THUMBNAILS_FOLDER = path.join(os.homedir(), '.cache', 'thumbnails');
const TEMPORAL_FOLDER = app.getPath('temp');
const INTERNXT_DRIVE_TMP = path.join(TEMPORAL_FOLDER, 'internxt-drive-tmp');
const DOWNLOADED = join(INTERNXT, 'downloaded');
const FUSE_DAEMON_LOG = join(LOGS, 'fuse-daemon.log');
const FUSE_DAEMON_SOCKET = join(process.env.XDG_RUNTIME_DIR ?? '/tmp', 'internxt-fuse.sock');
const FUSE_DAEMON_BINARY = app.isPackaged
  ? join(process.resourcesPath, 'fuse-daemon')
  : join(__dirname, '../../../dist/fuse-daemon');

export const PATHS = {
  HOME_FOLDER_PATH,
  INTERNXT,
  LOGS,
  THUMBNAILS_FOLDER,
  TEMPORAL_FOLDER,
  INTERNXT_DRIVE_TMP,
  DOWNLOADED,
  FUSE_DAEMON_LOG,
  FUSE_DAEMON_SOCKET,
  FUSE_DAEMON_BINARY,
};
