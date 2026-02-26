import { app } from 'electron';
import { join } from 'path';

const HOME_FOLDER_PATH = app.getPath('home');
const APP_DATA_PATH = app.getPath('appData');
const INTERNXT = join(APP_DATA_PATH, 'internxt-drive');
const LOGS = join(HOME_FOLDER_PATH, '.config', 'internxt', 'logs');

export const PATHS = {
  HOME_FOLDER_PATH,
  INTERNXT,
  LOGS,
};
