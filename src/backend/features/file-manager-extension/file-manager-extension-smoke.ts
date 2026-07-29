import { access, readFile, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { copyExtensionFile, deleteExtensionFile, isInstalled } from './service';
import { detectAvailableFileManager, type FileManagerType } from './detect-available';
import { isSupportedFileManager } from './constants';

type SupportedFileManager = Exclude<FileManagerType, null>;

type AssertProps = {
  condition: boolean;
  message: string;
};

function assertOrThrow({ condition, message }: AssertProps) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectedManagerFromEnv() {
  const raw = process.env.EXPECTED_FILE_MANAGER?.trim().toLowerCase();

  if (!raw) return null;

  if (isSupportedFileManager(raw)) return raw;

  throw new Error(`Invalid EXPECTED_FILE_MANAGER: ${raw}`);
}

function getExpectedPaths({ manager }: { manager: SupportedFileManager }) {
  const home = homedir();

  if (manager === 'nautilus') {
    return [join(home, '.local/share/nautilus-python/extensions/internxt-virtual-drive.py')];
  }

  if (manager === 'nemo') {
    return [join(home, '.local/share/nemo-python/extensions/internxt-virtual-drive.py')];
  }

  return [
    join(home, '.local/share/kio/servicemenus/internxt-virtual-drive.desktop'),
    join(home, '.local/share/kservices5/ServiceMenus/internxt-virtual-drive.desktop'),
    join(home, '.local/share/internxt-dolphin-extension/internxt-dolphin-actions.sh'),
  ];
}

async function assertPathExists({ filePath }: { filePath: string }) {
  await access(filePath, fsConstants.F_OK);
}

async function assertExecutable({ filePath }: { filePath: string }) {
  const fileStat = await stat(filePath);
  assertOrThrow({
    condition: (fileStat.mode & 0o111) !== 0,
    message: `Expected executable permissions for ${filePath}`,
  });
}

async function assertPathRemoved({ filePath }: { filePath: string }) {
  let exists = true;

  try {
    await access(filePath, fsConstants.F_OK);
  } catch {
    exists = false;
  }

  assertOrThrow({
    condition: !exists,
    message: `Expected file to be removed: ${filePath}`,
  });
}

async function assertNoHomeTemplateToken({ filePath }: { filePath: string }) {
  const content = await readFile(filePath, 'utf8');
  assertOrThrow({
    condition: !content.includes('{{HOME}}'),
    message: `Template token {{HOME}} was not replaced in ${filePath}`,
  });
}

async function run() {
  const detected = await detectAvailableFileManager();
  assertOrThrow({
    condition: detected !== null,
    message: 'No supported file manager detected in smoke environment',
  });

  const expectedFromEnv = expectedManagerFromEnv();
  if (expectedFromEnv) {
    assertOrThrow({
      condition: detected === expectedFromEnv,
      message: `Detected ${detected} but expected ${expectedFromEnv}`,
    });
  }

  const manager = detected as SupportedFileManager;
  const expectedPaths = getExpectedPaths({ manager });

  await deleteExtensionFile();

  const installedBefore = await isInstalled();
  assertOrThrow({
    condition: !installedBefore,
    message: 'Extension should not be installed after pre-cleanup',
  });

  await copyExtensionFile();

  const installedAfterCopy = await isInstalled();
  assertOrThrow({
    condition: installedAfterCopy,
    message: 'Extension should be installed after copyExtensionFile',
  });

  for (const filePath of expectedPaths) {
    await assertPathExists({ filePath });
  }

  if (manager === 'dolphin') {
    await assertNoHomeTemplateToken({ filePath: expectedPaths[0] });
    await assertNoHomeTemplateToken({ filePath: expectedPaths[1] });

    for (const filePath of expectedPaths) {
      await assertExecutable({ filePath });
    }
  }

  await deleteExtensionFile();

  const installedAfterDelete = await isInstalled();
  assertOrThrow({
    condition: !installedAfterDelete,
    message: 'Extension should not be installed after deleteExtensionFile',
  });

  for (const filePath of expectedPaths) {
    await assertPathRemoved({ filePath });
  }

  // eslint-disable-next-line no-console
  console.log(`File manager extension smoke passed for: ${manager}`);
}

run().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('File manager extension smoke failed');
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
