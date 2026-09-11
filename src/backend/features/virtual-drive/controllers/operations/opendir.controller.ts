import { Request, Response } from 'express';
import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { opendir } from '../../services/operations/opendir.service';
import { ensureLeadingSlash } from '../ensure-leading-slash';
import { findFolderFiles } from '../../../fuse/on-read/find-folder-files';
import { warmDownloadLinks } from '../../../fuse/on-read/warm-download-links';
import { DependencyInjectionUserProvider } from '../../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { buildNetworkClient } from '../../../../../infra/environment/download-file/build-network-client';

export async function openDirController(req: Request, res: Response, container: Container) {
  const rawPath: string = req.body.path ?? '';
  logger.debug({ msg: `[FUSE DAEMON] OpenDir signal received for path: ${rawPath}` });
  const normalizedPath = ensureLeadingSlash(rawPath);

  const { data, error } = await opendir(normalizedPath, container);

  if (error) {
    logger.error({ msg: error.message });
    res.json({ errno: error.code });
    return;
  }

  res.json({ errno: 0, ...data });

  void warmFolderDownloadLinks({ path: normalizedPath, container });
}

async function warmFolderDownloadLinks({ path, container }: { path: string; container: Container }) {
  try {
    const files = await findFolderFiles({ path, container });
    const user = DependencyInjectionUserProvider.get();
    const network = buildNetworkClient({ bridgeUser: user.bridgeUser, userId: user.userId });

    warmDownloadLinks({ files, bucketId: user.bucket, network });
  } catch (error) {
    logger.debug({ msg: '[FUSE - OpenDir] Failed to warm download links', path, error });
  }
}
