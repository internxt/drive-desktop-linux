import path from 'node:path';
import configStore from '../../config';
import { PATHS } from '../../../../core/electron/paths';

/**
 * The virtual drive is a FUSE mount. stat/readdir on it can block the libuv
 * thread pool forever, which freezes the system scan before ClamAV runs.
 * Resolve the configured mount without creating folders or rewriting config.
 */
function resolveInternxtMountPath() {
  const configuredRoot = configStore.get('virtualDriveRoot');

  if (!configuredRoot) {
    return PATHS.ROOT_DRIVE_FOLDER;
  }

  const resolvedRoot = path.resolve(configuredRoot);

  if (path.basename(resolvedRoot) === PATHS.VIRTUAL_DRIVE_FOLDER_NAME) {
    return resolvedRoot;
  }

  return path.join(resolvedRoot, PATHS.VIRTUAL_DRIVE_FOLDER_NAME);
}

function isInsidePath({ parentPath, childPath }: { parentPath: string; childPath: string }) {
  const relativePath = path.relative(parentPath, childPath);

  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath))
  );
}

export function isInternxtDrivePath({ pathName }: { pathName: string }) {
  return isInsidePath({
    parentPath: resolveInternxtMountPath(),
    childPath: path.resolve(pathName),
  });
}
