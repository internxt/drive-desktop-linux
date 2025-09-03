import { Dirent } from 'fs';
import { CleanableItem } from './cleaner.types';
import { wasAccessedWithinLastHour } from './utils/was-accessed-within-last-hour';
import { createCleanableItem } from './utils/create-cleanable-item';
import { scanDirectory } from './scan-directory';
import { logger } from '@internxt/drive-desktop-core/build/backend';

/**
 * Process a single directory entry (file or subdirectory)
 */
export async function processDirent(
  entry: Dirent,
  fullPath: string,
  customFilter?: (entry: Dirent, fullPath: string) => boolean
): Promise<CleanableItem[]> {
  try {
    if (entry.isFile()) {
      if (
        (await wasAccessedWithinLastHour(fullPath)) ||
        (customFilter && customFilter(entry, fullPath))
      ) {
        return [];
      }

      const item = await createCleanableItem(fullPath);
      return [item];
    } else if (entry.isDirectory()) {
      return await scanDirectory(fullPath, customFilter);
    }
  } catch (error) {
    logger.warn({
      msg: `File or Directory with path ${fullPath} cannot be accessed, skipping`,
    });
  }

  return [];
}
