import { app } from 'electron';
import path, { join } from 'node:path';
import os from 'node:os';

const HOME_FOLDER_PATH = app.getPath('home');
const APP_DATA_PATH = app.getPath('appData');
const INTERNXT = join(APP_DATA_PATH, 'internxt');
const INTERNXT_DRIVE = join(APP_DATA_PATH, 'internxt-drive');
const LOGS = join(INTERNXT, 'logs');
const DATABASE = join(INTERNXT_DRIVE, 'internxt_desktop.db');
const ROOT_DRIVE_FOLDER = join(HOME_FOLDER_PATH, 'Internxt Drive');
const THUMBNAILS_FOLDER = path.join(os.homedir(), '.cache', 'thumbnails');
const TEMPORAL_FOLDER = app.getPath('temp');
const INTERNXT_DRIVE_TMP = path.join(TEMPORAL_FOLDER, 'internxt-drive-tmp');
const DOWNLOADED = join(INTERNXT, 'downloaded');

export const PATHS = {
  HOME_FOLDER_PATH,
  INTERNXT,
  LOGS,
  DATABASE,
  THUMBNAILS_FOLDER,
  TEMPORAL_FOLDER,
  INTERNXT_DRIVE_TMP,
  ROOT_DRIVE_FOLDER,
  DOWNLOADED,
};
