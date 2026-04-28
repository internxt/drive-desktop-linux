import { Request, Response } from 'express';
import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { write } from '../../services/operations/write.service';
import { ensureLeadingSlash } from '../ensure-leading-slash';

export async function writeController(req: Request, res: Response, container: Container) {
  const rawPath = req.body.path;
  const rawOffset = req.body.offset;
  const rawData = req.body.data;

  if (typeof rawPath !== 'string' || typeof rawOffset !== 'number' || typeof rawData !== 'string') {
    logger.error({ msg: '[FUSE DAEMON] Write: missing required fields', body: req.body });
    res.json({ errno: FuseCodes.EINVAL });
    return;
  }

  const normalizedPath = ensureLeadingSlash(rawPath);
  const content = Buffer.from(rawData, 'base64');

  logger.debug({
    msg: '[FUSE DAEMON] Write signal received',
    path: normalizedPath,
    offset: rawOffset,
    length: content.length,
  });

  const result = await write({ path: normalizedPath, content, offset: rawOffset, container });

  if (result.error) {
    res.json({ errno: result.error.code });
    return;
  }

  res.json({ errno: 0, written: result.data });
}
