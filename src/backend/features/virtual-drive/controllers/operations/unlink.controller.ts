import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Container } from 'diod';
import { Request, Response } from 'express';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { unlink } from '../../services/operations/unlink.service';

export async function unlinkController(req: Request, res: Response, container: Container) {
  logger.debug({ msg: '[FUSE DAEMON] Unlink signal received' });

  const rawPath: string = req.body.path ?? '';
  const normalizedPath = rawPath === '' || rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const response = await unlink(normalizedPath, container);

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
