import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export type FileManagerType = 'nautilus' | 'nemo' | null;

export async function detectAvailableFileManager(): Promise<FileManagerType> {
  const desktopEntry = await getDefaultDirectoryDesktopEntry();

  if (desktopEntry) {
    if (desktopEntry.includes('nemo.desktop')) {
      if (await hasNemoBinary()) {
        return 'nemo';
      }
    }

    if (desktopEntry.includes('nautilus.desktop')) {
      if (await hasNautilusBinary()) {
        return 'nautilus';
      }
    }
  }

  // Fallback: check for available binaries
  const hasNemo = await hasNemoBinary();
  if (hasNemo) {
    return 'nemo';
  }

  const hasNautilus = await hasNautilusBinary();
  if (hasNautilus) {
    return 'nautilus';
  }

  return null;
}

export async function isNautilusAvailable(): Promise<boolean> {
  return (await detectAvailableFileManager()) === 'nautilus';
}

export async function isNemoAvailable(): Promise<boolean> {
  return (await detectAvailableFileManager()) === 'nemo';
}

async function getDefaultDirectoryDesktopEntry(): Promise<string> {
  try {
    const { stdout } = await execAsync('xdg-mime query default inode/directory');
    return stdout.trim().toLowerCase();
  } catch {
    return '';
  }
}

async function hasNautilusBinary(): Promise<boolean> {
  try {
    await execAsync('command -v nautilus');
    return true;
  } catch {
    return false;
  }
}

async function hasNemoBinary(): Promise<boolean> {
  try {
    await execAsync('command -v nemo');
    return true;
  } catch {
    return false;
  }
}
