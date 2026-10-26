import { Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { PathTypeChecker } from '../../../shared/fs/PathTypeChecker ';
import { isPermissionError } from './isPermissionError';
import { isInternxtDrivePath } from './isInternxtDrivePath';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getErrorMessage } from './errorUtils';

function isSkippedInternxtMount(pathName: string) {
  if (!isInternxtDrivePath({ pathName })) return false;

  logger.debug({
    tag: 'ANTIVIRUS',
    msg: 'Skipping Internxt Drive mount',
    pathName,
  });

  return true;
}

const isNonTempItem = (item: Dirent, dir: string): boolean => {
  const fullPath = resolve(dir, item.name);
  const isDirectory = item.isDirectory();
  return (
    (isDirectory && !fullPath.toLowerCase().includes('temp') && !fullPath.toLowerCase().includes('tmp')) ||
    (!isDirectory && !fullPath.toLowerCase().endsWith('.tmp'))
  );
};

type Props = {
  dir: string;
  cb: (file: string) => Promise<void>;
  signal: AbortSignal;
};

export async function getFilesFromDirectory({ dir, cb, signal }: Props): Promise<void | null> {
  if (signal.aborted) {
    logger.debug({
      tag: 'ANTIVIRUS',
      msg: `Directory traversal cancelled at ${dir}`,
    });
    return;
  }

  if (isSkippedInternxtMount(dir)) {
    return;
  }

  let items: Dirent[];
  const isFile = await PathTypeChecker.isFile(dir);

  if (isFile) {
    // Make sure to await the callback
    try {
      await cb(dir);
    } catch (error) {
      logger.error({
        tag: 'ANTIVIRUS',
        msg: `Error processing file "${dir}": ${getErrorMessage(error)}`,
        error,
      });
    }
    return;
  }

  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch (error: unknown) {
    if (isPermissionError(error)) {
      logger.error({
        tag: 'ANTIVIRUS',
        msg: `Skipping directory "${dir}" due to permission error: ${getErrorMessage(error)}`,
      });
      return;
    }

    logger.warn({
      tag: 'ANTIVIRUS',
      msg: `Error reading directory "${dir}": ${getErrorMessage(error)}`,
      error,
    });
    return;
  }

  const nonTempItems = items.filter((item) => isNonTempItem(item, dir));

  for (const item of nonTempItems) {
    if (signal.aborted) {
      logger.debug({
        tag: 'ANTIVIRUS',
        msg: `Directory traversal cancelled during processing at ${dir}`,
      });
      return;
    }

    const fullPath = resolve(dir, item.name);
    if (item.isDirectory()) {
      if (isSkippedInternxtMount(fullPath)) {
        continue;
      }

      try {
        const subitems = await readdir(fullPath, { withFileTypes: true });
        if (subitems.length > 0) {
          await getFilesFromDirectory({ dir: fullPath, cb, signal });
        }
      } catch (error: unknown) {
        if (isPermissionError(error)) {
          logger.debug({
            tag: 'ANTIVIRUS',
            msg: `Skipping subdirectory "${fullPath}" due to permission error: ${getErrorMessage(error)}`,
          });
        } else {
          logger.warn({
            tag: 'ANTIVIRUS',
            msg: `Error accessing subdirectory "${fullPath}": ${getErrorMessage(error)}`,
            error,
          });
        }
      }
    } else {
      try {
        await cb(fullPath);
      } catch (error: unknown) {
        logger.warn({
          tag: 'ANTIVIRUS',
          msg: `Error processing file "${fullPath}": ${getErrorMessage(error)}`,
          error,
        });
      }
    }
  }
}

const DIRECTORY_READ_CONCURRENCY = 8;
const DIRECTORIES_BEFORE_YIELD = 40;

async function readDirectoryForCount(folder: string) {
  try {
    const items = await readdir(folder, { withFileTypes: true });
    let fileCount = 0;
    const directories: string[] = [];

    for (const item of items) {
      if (!isNonTempItem(item, folder)) {
        continue;
      }

      const fullPath = resolve(folder, item.name);
      if (!item.isDirectory()) {
        fileCount += 1;
        continue;
      }

      if (!isSkippedInternxtMount(fullPath)) {
        directories.push(fullPath);
      }
    }

    return { fileCount, directories };
  } catch (error) {
    if (isPermissionError(error)) {
      logger.warn({
        tag: 'ANTIVIRUS',
        msg: `Skipping directory "${folder}" due to permission error.`,
      });
      return { fileCount: 0, directories: [] };
    }

    // Callers already treat an unexpected read failure as a failed count.
    throw error;
  }
}

/**
 * Opening every subdirectory at once saturates the filesystem thread pool and
 * stops the main process from answering, which freezes the window on top of
 * the counting animation. The cap keeps several reads in flight, and the yield
 * gives that animation a turn to paint.
 */
export async function countSystemFiles(folder: string) {
  if (isSkippedInternxtMount(folder)) {
    return 0;
  }

  if (await PathTypeChecker.isFile(folder)) {
    return 1;
  }

  let total = 0;
  let completedDirectories = 0;
  let activeReads = 0;
  let settled = false;
  const pending = [folder];

  await new Promise<void>((resolve, reject) => {
    function finish() {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    }

    function fail(error: unknown) {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    }

    function pump() {
      if (settled) {
        return;
      }

      if (pending.length === 0 && activeReads === 0) {
        finish();
        return;
      }

      while (activeReads < DIRECTORY_READ_CONCURRENCY && pending.length > 0) {
        const current = pending.pop();
        if (!current) {
          break;
        }

        activeReads += 1;
        void readDirectoryForCount(current)
          .then(async (counted) => {
            if (settled) {
              return;
            }

            total += counted.fileCount;
            for (const directory of counted.directories) {
              pending.push(directory);
            }
            completedDirectories += 1;

            if (completedDirectories % DIRECTORIES_BEFORE_YIELD === 0) {
              await new Promise((done) => {
                setImmediate(done);
              });
            }
          })
          .then(() => {
            activeReads -= 1;
            pump();
          })
          .catch((error: unknown) => {
            activeReads -= 1;
            fail(error);
          });
      }
    }

    pump();
  });

  return total;
}
