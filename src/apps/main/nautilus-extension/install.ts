import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { doesFileExist } from '../../shared/fs/fileExists';

const name = 'internxt-virtual-drive.py';

const homedir = os.homedir();

const destination = `${homedir}/.local/share/nautilus-python/extensions/${name}`;

function extensionFile() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, name);
  }

  return `${path.join(__dirname, name)}`;
}

export async function install(): Promise<void> {
  const alreadyExists = await doesFileExist(destination);
  if (alreadyExists) return;

  const source = extensionFile();

  await fs.cp(source, destination);
}

export async function uninstall(): Promise<void> {
  const isNotThere = await doesFileExist(destination);
  if (isNotThere) return;

  const source = extensionFile();

  await fs.rm(source);
}
