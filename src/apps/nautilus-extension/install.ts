import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { doesFileExist } from '../shared/fs/fileExists';
import { app } from 'electron';

const name = 'internxt-virtual-drive.py';

const homedir = os.homedir();

const destination = `${homedir}/.local/share/nautilus-python/extensions/${name}`;

function extensionFile() {
  if (!app.isPackaged) {
    return path.join(__dirname, 'src', 'apps', 'nautilus-extension', name);
  }

  return path.join(
    process.resourcesPath,
    'src',
    'apps',
    'nautilus-extension',
    name
  );
}

export async function installNautilusExtension(): Promise<void> {
  const alreadyExists = await doesFileExist(destination);
  if (alreadyExists) return;

  const source = extensionFile();

  await fs.cp(source, destination);
}

export async function uninstallNautilusExtension(): Promise<void> {
  const isNotThere = await doesFileExist(destination);
  if (isNotThere) return;

  const source = extensionFile();

  await fs.rm(source);
}
