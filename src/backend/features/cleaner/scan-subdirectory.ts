import { CleanableItem } from './cleaner.types';
import { promises as fs } from 'fs';
import path from 'path';
import { isInternxtRelated } from './utils/is-file-internxt-related';
import { scanDirectory } from './scan-directory';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { appCacheFileFilter } from './app-cache/utils/is-safe-cache-file';

async function getFilteredDirectories(
  baseDir: string,
  customDirectoryFiler?: (directoryName: string) => boolean
) {
  return await fs
    .readdir(baseDir, { withFileTypes: true })
    .then((dirents) =>
      dirents.filter(
        (dirent) =>
          dirent.isDirectory() &&
          !isInternxtRelated(dirent.name) &&
          (!customDirectoryFiler || !customDirectoryFiler(dirent.name))
      )
    );
}

/**
 * Scan subdirectories within a given base directory
 * @param baseDir Base directory containing app folders (e.g., ~/.local/share)
 * @param subPath Sub-path to scan within each app directory (e.g., 'cache')
 *  @param customDirectoryFiler Optional custom filter function to apply to directories.
 *  Return true to skip the directory, false to include it.
 */
export async function scanSubDirectory(
  baseDir: string,
  subPath: string,
  customDirectoryFiler?: (directoryName: string) => boolean
): Promise<CleanableItem[]> {
  const cleanableItems: CleanableItem[] = [];
  try {
    const directories = await getFilteredDirectories(
      baseDir,
      customDirectoryFiler
    );

    const scanPromises = directories.map((directory) => {
      const targetDir = path.join(baseDir, directory.name, subPath);
      return scanDirectory(targetDir, appCacheFileFilter);
    });

    const results = await Promise.allSettled(scanPromises);

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        cleanableItems.push(...result.value);
      }
    });
  } catch (error) {
    logger.warn({
      msg: `[CLEANER] Directory ${subPath} within ${baseDir} might not exist or be accesible, skipping it`,
    });
  }

  return cleanableItems;
}
