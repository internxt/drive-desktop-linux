import { app } from 'electron';
import path, { join } from 'node:path';
import os from 'node:os';

const HOME_FOLDER_PATH = app.getPath('home');
const LOGS = join(HOME_FOLDER_PATH, '.config', 'internxt', 'logs');
const THUMBNAILS_FOLDER = path.join(os.homedir(), '.cache', 'thumbnails');
export const PATHS = {
  HOME_FOLDER_PATH,
  LOGS,
  THUMBNAILS_FOLDER,
};
