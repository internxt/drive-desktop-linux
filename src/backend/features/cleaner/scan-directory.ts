import { CleanableItem } from './cleaner.types';
import { Dirent, promises as fs } from 'fs';
import path from 'path';
import { isInternxtRelated } from './utils/is-file-internxt-related';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { processDirent } from './process-dirent';

/**
 * scan a directory and process the result dirents (directory or file entries)
 * @param dirPath Directory path to scan
 * @param direntCustomFilter Optional custom filter function to apply to files.
 *  Return true to skip the file, false to include it.
 */
export async function scanDirectory(
  dirPath: string,
  direntCustomFilter?: (entry: Dirent, fullPath: string) => boolean
): Promise<CleanableItem[]> {
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      return [];
    }

    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    const items: CleanableItem[] = [];

    for (const dirent of dirents) {
      const fullPath = path.join(dirPath, dirent.name);
      if (!isInternxtRelated(fullPath)) {
        const cleanableItems = await processDirent(
          dirent,
          fullPath,
          direntCustomFilter
        );
        items.push(...cleanableItems);
      }
    }

    return items;
  } catch (error) {
    logger.warn({
      msg: `Directory ${dirPath} does not exist or cannot be accessed, skipping`,
    });
    return [];
  }
}
