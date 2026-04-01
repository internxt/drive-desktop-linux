import { app } from 'electron';
import path, { join } from 'node:path';
import os from 'node:os';

const HOME_FOLDER_PATH = app.getPath('home');
const APP_DATA_PATH = app.getPath('appData');
const INTERNXT_DRIVE = join(APP_DATA_PATH, 'internxt-drive');
const INTERNXT = join(HOME_FOLDER_PATH, '.config', 'internxt');
const LOGS = join(INTERNXT, 'logs');
const THUMBNAILS_FOLDER = path.join(os.homedir(), '.cache', 'thumbnails');
const TEMPORAL_FOLDER = app.getPath('temp');
const INTERNXT_DRIVE_TMP = path.join(TEMPORAL_FOLDER, 'internxt-drive-tmp');
const DOWNLOADED = join(INTERNXT, 'downloaded');

export const PATHS = {
  HOME_FOLDER_PATH,
  INTERNXT_DRIVE,
  INTERNXT,
  LOGS,
  THUMBNAILS_FOLDER,
  TEMPORAL_FOLDER,
  INTERNXT_DRIVE_TMP,
  DOWNLOADED,
};
