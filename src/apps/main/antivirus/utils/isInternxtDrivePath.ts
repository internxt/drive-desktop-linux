import path from 'node:path';
import { resolveInternxtMountPath } from '../../../../shared/virtual-drive/resolve-internxt-mount-path';

function isInsidePath({ parentPath, childPath }: { parentPath: string; childPath: string }) {
  const relativePath = path.relative(parentPath, childPath);

  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath))
  );
}

/**
 * The virtual drive is a FUSE mount. stat/readdir on it can block the libuv
 * thread pool forever, which freezes the system scan before ClamAV runs.
 * Resolve the configured mount without creating folders or rewriting config.
 */
export function isInternxtDrivePath({ pathName }: { pathName: string }) {
  return isInsidePath({
    parentPath: resolveInternxtMountPath(),
    childPath: path.resolve(pathName),
  });
}
