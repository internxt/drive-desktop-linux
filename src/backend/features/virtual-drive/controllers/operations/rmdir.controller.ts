import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Container } from 'diod';
import { Request, Response } from 'express';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { ensureLeadingSlash } from '../ensure-leading-slash';
import { rmdir } from '../../services/operations/rmdir.service';

export async function rmdirController(req: Request, res: Response, container: Container) {
  const rawPath: string = req.body.path ?? '';
  logger.debug({ msg: '[FUSE DAEMON] Rmdir signal received', path: rawPath });

  const normalizedPath = ensureLeadingSlash(rawPath);
  const response = await rmdir(normalizedPath, container);

  if (response.error) {
    // A client asked to remove a folder that still has uploads in it. That is a
    // refusal, not a failed trash.
    if (response.error.code === FuseCodes.ENOTEMPTY) {
      logger.warn({ msg: response.error.message, path: normalizedPath });
    } else {
      logger.error({ msg: response.error.message });
    }

    res.json({ errno: response.error.code });
    return;
  }

  res.json({ errno: 0 });
}
