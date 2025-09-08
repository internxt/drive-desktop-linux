import os from 'os';
import path from 'path';
import { WebCacheFilesPaths } from '../cleaner.types';

/**
 * Get all relevant web cache paths
 */
export function getWebCacheFilesPaths(): WebCacheFilesPaths {
  const homeDir = os.homedir();

  return {
    chromeCacheDir: path.join(
      homeDir,
      '.cache',
      'google-chrome',
      'Default',
      'Cache'
    ),
  };
}
