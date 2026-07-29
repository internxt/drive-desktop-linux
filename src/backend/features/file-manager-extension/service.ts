import { exec } from 'node:child_process';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { doesFileExist } from '../../../apps/shared/fs/fileExists';
import { detectAvailableFileManager, type FileManagerType } from './detect-available';

const extensionFileName = 'internxt-virtual-drive.py';
const homedir = os.homedir();

type FileManagerConfig = {
  type: FileManagerType;
  destinationDir: string;
  reloadCommand: string;
  extensionAssetDir: string;
};

async function getFileManagerConfig(): Promise<FileManagerConfig | null> {
  const fileManager = await detectAvailableFileManager();

  if (fileManager === 'nemo') {
    return {
      type: 'nemo',
      destinationDir: `${homedir}/.local/share/nemo-python/extensions/`,
      reloadCommand: 'nemo -q',
      extensionAssetDir: 'python-nemo',
    };
  }

  if (fileManager === 'nautilus') {
    return {
      type: 'nautilus',
      destinationDir: `${homedir}/.local/share/nautilus-python/extensions/`,
      reloadCommand: 'nautilus -q',
      extensionAssetDir: 'python-nautilus',
    };
  }

  return null;
}

function getExtensionFile(assetDir: string): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, `../../../../assets/${assetDir}`, extensionFileName);
  } else {
    return path.join(process.resourcesPath, 'assets', assetDir, extensionFileName);
  }
}

export async function getFileManagerType(): Promise<FileManagerType> {
  return await detectAvailableFileManager();
}

export async function isInstalled(): Promise<boolean> {
  const config = await getFileManagerConfig();
  if (!config) return false;

  const destination = path.join(config.destinationDir, extensionFileName);
  return await doesFileExist(destination);
}

export async function copyExtensionFile(): Promise<void> {
  const config = await getFileManagerConfig();
  if (!config) return;

  const alreadyExists = await doesFileExist(path.join(config.destinationDir, extensionFileName));
  if (alreadyExists) return;

  const source = getExtensionFile(config.extensionAssetDir);
  const destination = path.join(config.destinationDir, extensionFileName);

  await fs.mkdir(config.destinationDir, {
    recursive: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    await fs.link(source, destination);
    return;
  }

  await fs.cp(source, destination);

  logger.debug({
    msg: `[FILE_MANAGER_EXTENSION] Added ${config.type} extension file to ${destination}`,
  });
}

export async function deleteExtensionFile(): Promise<void> {
  const config = await getFileManagerConfig();
  if (!config) return;

  const destination = path.join(config.destinationDir, extensionFileName);
  const isThere = await doesFileExist(destination);
  if (!isThere) return;

  await fs.rm(destination);

  logger.debug({
    msg: `[FILE_MANAGER_EXTENSION] Deleted ${config.type} extension file from ${destination}`,
  });
}

export async function reloadFileManager(): Promise<void> {
  const config = await getFileManagerConfig();
  if (!config) {
    return;
  }

  return new Promise((resolve, reject) => {
    const childProcess = exec(config.reloadCommand, { timeout: 3000 }, (error, _, stderr) => {
      if (error) {
        if (error.code === 255) {
          // nautilus -q and nemo -q typically return 255 status
          resolve();
          return;
        }

        if (error.killed && error.signal === 'SIGTERM') {
          reject(new Error('File manager reload timed out'));
          return;
        }

        reject(error);
        return;
      }

      if (stderr) {
        reject(new Error(stderr));
        return;
      }

      resolve();
    });

    childProcess.on('error', reject);
  });
}
