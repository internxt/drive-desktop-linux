import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Container } from 'diod';
import { Request, Response } from 'express';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { rmdir } from '../../services/operations/rmdir.service';

export async function rmdirController(req: Request, res: Response, container: Container) {
  logger.debug({ msg: '[FUSE DAEMON] Rmdir signal received' });

  const rawPath: string = req.body.path ?? '';
  const normalizedPath = rawPath === '' || rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const response = await rmdir(normalizedPath, container);

  if (response.error) {
    logger.error({ msg: response.error.message });

    if (response.error.code === FuseCodes.ENOENT) {
      res.status(404).send();
      return;
    }

    res.status(500).send();
    return;
  }

  res.status(200).send();
}
