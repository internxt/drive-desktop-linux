import { exec } from 'node:child_process';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { doesFileExist } from '../../../apps/shared/fs/fileExists';
import { detectAvailableFileManager, type FileManagerType } from './detect-available';

const homedir = os.homedir();

const nautilusExtensionFileName = 'internxt-virtual-drive.py';
const nemoExtensionFileName = 'internxt-virtual-drive.py';
const dolphinMenuFileName = 'internxt-virtual-drive.desktop';
const dolphinHelperFileName = 'internxt-dolphin-actions.sh';

type FileManagerAsset = {
  source: string;
  destination: string;
  executable?: boolean;
  template?: boolean;
};

type FileManagerConfig = {
  type: FileManagerType;
  reloadCommand: string;
  assets: FileManagerAsset[];
};

function isIgnorableReloadStderr({ fileManagerType, stderr }: { fileManagerType: FileManagerType; stderr: string }) {
  if (fileManagerType !== 'dolphin') {
    return false;
  }

  return stderr.includes(
    'Application dolphin could not be found using service org.kde.dolphin and path /MainApplication.',
  );
}

async function getFileManagerConfig(): Promise<FileManagerConfig | null> {
  const fileManager = await detectAvailableFileManager();

  if (fileManager === 'dolphin') {
    return {
      type: 'dolphin',
      reloadCommand: 'kquitapp6 dolphin || kquitapp5 dolphin || true',
      assets: [
        {
          source: 'dolphin/internxt-virtual-drive.desktop',
          destination: `${homedir}/.local/share/kio/servicemenus/${dolphinMenuFileName}`,
          template: true,
          executable: true,
        },
        {
          source: 'dolphin/internxt-virtual-drive.desktop',
          destination: `${homedir}/.local/share/kservices5/ServiceMenus/${dolphinMenuFileName}`,
          template: true,
          executable: true,
        },
        {
          source: `dolphin/${dolphinHelperFileName}`,
          destination: `${homedir}/.local/share/internxt-dolphin-extension/${dolphinHelperFileName}`,
          executable: true,
        },
      ],
    };
  }

  if (fileManager === 'nemo') {
    return {
      type: 'nemo',
      reloadCommand: 'nemo -q',
      assets: [
        {
          source: `python-nemo/${nemoExtensionFileName}`,
          destination: `${homedir}/.local/share/nemo-python/extensions/${nemoExtensionFileName}`,
        },
      ],
    };
  }

  if (fileManager === 'nautilus') {
    return {
      type: 'nautilus',
      reloadCommand: 'nautilus -q',
      assets: [
        {
          source: `python-nautilus/${nautilusExtensionFileName}`,
          destination: `${homedir}/.local/share/nautilus-python/extensions/${nautilusExtensionFileName}`,
        },
      ],
    };
  }

  return null;
}

function getExtensionFile(source: string): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, `../../../../assets/${source}`);
  } else {
    return path.join(process.resourcesPath, 'assets', source);
  }
}

export async function getFileManagerType(): Promise<FileManagerType> {
  return await detectAvailableFileManager();
}

export async function isInstalled(): Promise<boolean> {
  const config = await getFileManagerConfig();
  if (!config) return false;

  const installedStates = await Promise.all(config.assets.map((asset) => doesFileExist(asset.destination)));

  return installedStates.every(Boolean);
}

export async function copyExtensionFile(): Promise<void> {
  const config = await getFileManagerConfig();
  if (!config) return;

  const alreadyInstalled = await isInstalled();
  if (alreadyInstalled) return;

  await Promise.all(
    config.assets.map(async (asset) => {
      const source = getExtensionFile(asset.source);
      const destination = asset.destination;

      const destinationExists = await doesFileExist(destination);
      if (destinationExists) {
        if (asset.executable) {
          await fs.chmod(destination, 0o755);
        }
        return;
      }

      await fs.mkdir(path.dirname(destination), {
        recursive: true,
      });

      if (asset.template) {
        const template = await fs.readFile(source, 'utf8');
        await fs.writeFile(destination, template.replaceAll('{{HOME}}', homedir), 'utf8');
      } else if (process.env.NODE_ENV !== 'production') {
        await fs.link(source, destination);
      } else {
        await fs.cp(source, destination);
      }

      if (asset.executable) {
        await fs.chmod(destination, 0o755);
      }
    }),
  );

  logger.debug({
    msg: `[FILE_MANAGER_EXTENSION] Added ${config.type} extension assets`,
  });
}

export async function deleteExtensionFile(): Promise<void> {
  const config = await getFileManagerConfig();
  if (!config) return;

  await Promise.all(
    config.assets.map(async (asset) => {
      const isThere = await doesFileExist(asset.destination);
      if (!isThere) {
        return;
      }

      await fs.rm(asset.destination);
    }),
  );

  logger.debug({
    msg: `[FILE_MANAGER_EXTENSION] Deleted ${config.type} extension assets`,
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

      if (stderr && !isIgnorableReloadStderr({ fileManagerType: config.type, stderr })) {
        reject(new Error(stderr));
        return;
      }

      resolve();
    });

    childProcess.on('error', reject);
  });
}
