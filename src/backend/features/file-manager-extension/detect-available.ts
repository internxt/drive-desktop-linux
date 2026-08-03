import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { type SupportedFileManager } from './constants';

const execAsync = promisify(exec);

type FileManagerCandidate = {
  type: SupportedFileManager;
  desktopEntry: string;
  hasBinary: () => Promise<boolean>;
};

const FILE_MANAGER_CANDIDATES: FileManagerCandidate[] = [
  { type: 'dolphin', desktopEntry: 'dolphin.desktop', hasBinary: hasDolphinBinary },
  { type: 'nemo', desktopEntry: 'nemo.desktop', hasBinary: hasNemoBinary },
  { type: 'nautilus', desktopEntry: 'nautilus.desktop', hasBinary: hasNautilusBinary },
];

export async function detectAvailableFileManager(): Promise<SupportedFileManager> {
  const desktopEntry = await getDefaultDirectoryDesktopEntry();

  if (desktopEntry) {
    for (const candidate of FILE_MANAGER_CANDIDATES) {
      if (desktopEntry.includes(candidate.desktopEntry) && (await candidate.hasBinary())) {
        return candidate.type;
      }
    }
  }

  // Fallback: check for available binaries
  for (const candidate of FILE_MANAGER_CANDIDATES) {
    if (await candidate.hasBinary()) {
      return candidate.type;
    }
  }

  return null;
}

export async function isNautilusAvailable(): Promise<boolean> {
  return (await detectAvailableFileManager()) === 'nautilus';
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

async function hasDolphinBinary(): Promise<boolean> {
  try {
    await execAsync('command -v dolphin');
    return true;
  } catch {
    return false;
  }
}
