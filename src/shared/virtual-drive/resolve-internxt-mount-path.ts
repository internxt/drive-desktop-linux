import { basename, join, resolve } from 'node:path';
import configStore from '../../apps/main/config';
import { PATHS } from '../../core/electron/paths';

/** Absolute path to the Internxt Drive FUSE mount (e.g. `…/Internxt Drive`). */
export function resolveInternxtMountPath(): string {
  const configuredRoot = configStore.get('virtualDriveRoot');

  if (!configuredRoot) {
    return PATHS.ROOT_DRIVE_FOLDER;
  }

  const resolvedRoot = resolve(configuredRoot);

  if (basename(resolvedRoot) === PATHS.VIRTUAL_DRIVE_FOLDER_NAME) {
    return resolvedRoot;
  }

  return join(resolvedRoot, PATHS.VIRTUAL_DRIVE_FOLDER_NAME);
}
