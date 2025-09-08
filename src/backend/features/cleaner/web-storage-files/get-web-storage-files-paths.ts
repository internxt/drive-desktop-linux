import os from 'os';
import path from 'path';
import { WebStorageFilesPaths } from '../cleaner.types';

/**
 * Get all relevant web storage file paths (Google Chrome focus)
 */
export function getWebStorageFilesPaths(): WebStorageFilesPaths {
  const homeDir = os.homedir();
  const chromeDefaultProfile = path.join(homeDir, '.config', 'google-chrome', 'Default');

  return {
    chromeCookies: path.join(chromeDefaultProfile, 'Cookies'),
    chromeLocalStorage: path.join(chromeDefaultProfile, 'Local Storage'),
    chromeSessionStorage: path.join(chromeDefaultProfile, 'Session Storage'),
    chromeIndexedDB: path.join(chromeDefaultProfile, 'IndexedDB'),
    chromeWebStorage: path.join(chromeDefaultProfile, 'WebStorage'),
  };
}
