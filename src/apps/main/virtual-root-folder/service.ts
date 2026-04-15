import { dialog } from 'electron';
import fs from 'fs/promises';
import { sep } from 'node:path';
import configStore from '../config';
import eventBus from '../event-bus';
import { execFile } from 'node:child_process';
import { ensureFolderExists } from '../../shared/fs/ensure-folder-exists';
import { PATHS } from '../../../core/electron/paths';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { broadcastToWindows } from '../windows';

const VIRTUAL_DRIVE_FOLDER = PATHS.ROOT_DRIVE_FOLDER;

async function existsFolder(pathname: string): Promise<boolean> {
  try {
    await fs.access(pathname);

    return true;
  } catch {
    return false;
  }
}

export async function clearDirectory(pathname: string): Promise<boolean> {
  try {
    await fs.rm(pathname, { recursive: true });
    await fs.mkdir(pathname);

    return true;
  } catch {
    return false;
  }
}

async function isEmptyFolder(pathname: string): Promise<boolean> {
  const filesInFolder = await fs.readdir(pathname);

  return filesInFolder.length === 0;
}

function setSyncRoot(pathname: string): void {
  const pathNameWithSepInTheEnd = pathname[pathname.length - 1] === sep ? pathname : pathname + sep;
  configStore.set('syncRoot', pathNameWithSepInTheEnd);
  configStore.set('lastSavedListing', '');
}

export function getRootVirtualDrive(): string {
  const current = configStore.get('syncRoot');
  ensureFolderExists(current);

  if (current !== VIRTUAL_DRIVE_FOLDER) {
    setupRootFolder();
  }

  return configStore.get('syncRoot');
}

export async function setupRootFolder(n = 0): Promise<void> {
  setSyncRoot(VIRTUAL_DRIVE_FOLDER);
  return;
}

export async function chooseSyncRootWithDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (!result.canceled) {
    const chosenPath = result.filePaths[0];

    setSyncRoot(chosenPath);
    eventBus.emit('SYNC_ROOT_CHANGED', chosenPath);

    return chosenPath;
  }

  return null;
}

export async function openVirtualDriveRootFolder(): Promise<void> {
  const syncFolderPath = getRootVirtualDrive();

  function openWithXdg(targetPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      execFile('xdg-open', [targetPath], (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  try {
    await openWithXdg(syncFolderPath);
    return;
  } catch (error) {
    logger.warn({
      msg: '[VIRTUAL DRIVE] opening mountpoint failed',
      syncFolderPath,
      error,
    });

    broadcastToWindows('virtual-drive-folder-open-error', undefined);
  }
}
