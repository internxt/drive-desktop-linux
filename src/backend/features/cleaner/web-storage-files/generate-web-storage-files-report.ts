import { CleanableItem, CleanerSection } from '../cleaner.types';
import { scanDirectory } from '../scan-directory';
import { scanSingleFile } from '../scan-single-file';
import { getWebStorageFilesPaths } from './get-web-storage-files-paths';
import { webBrowserFileFilter } from '../utils/is-safe-web-browser-file';

/**
 * Generates a report for Web Storage Files section by scanning Chrome storage locations
 * @returns Promise<CleanerSection> Report containing all web storage files
 */
export async function generateWebStorageFilesReport(): Promise<CleanerSection> {
  const paths = getWebStorageFilesPaths();
  const allItems: CleanableItem[] = [];

  const scanSubSectionPromises = [
    /**
     * Scan ~/.config/google-chrome/Default/Cookies
     */
    scanSingleFile(paths.chromeCookies),
    /**
     * Scan ~/.config/google-chrome/Default/Local Storage/
     */
    scanDirectory({
      dirPath: paths.chromeLocalStorage,
      customFileFilter: webBrowserFileFilter,
    }),
    /**
     * Scan ~/.config/google-chrome/Default/Session Storage/
     */
    scanDirectory({
      dirPath: paths.chromeSessionStorage,
      customFileFilter: webBrowserFileFilter,
    }),
    /**
     * Scan ~/.config/google-chrome/Default/IndexedDB/
     */
    scanDirectory({
      dirPath: paths.chromeIndexedDB,
      customFileFilter: webBrowserFileFilter,
    }),
    /**
     * Scan ~/.config/google-chrome/Default/WebStorage/
     */
    scanDirectory({
      dirPath: paths.chromeWebStorage,
      customFileFilter: webBrowserFileFilter,
    }),
  ];

  const results = await Promise.allSettled(scanSubSectionPromises);

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  });

  const totalSizeInBytes = allItems.reduce(
    (sum, item) => sum + item.sizeInBytes,
    0
  );

  const result = {
    totalSizeInBytes,
    items: allItems,
  };
  return result;
}
