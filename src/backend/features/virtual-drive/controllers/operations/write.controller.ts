import { Request, Response } from 'express';
import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { write } from '../../services/operations/write.service';
import { ensureLeadingSlash } from '../ensure-leading-slash';

export async function writeController(req: Request, res: Response, container: Container) {
  const rawPath = req.header('X-Path');
  const rawOffset = req.header('X-Offset');
  const body = req.body;
  const content = Buffer.isBuffer(body) ? body : undefined;
  const offset = rawOffset ? Number.parseInt(rawOffset, 10) : Number.NaN;

  if (typeof rawPath !== 'string' || Number.isNaN(offset) || !content) {
    logger.error({
      msg: '[FUSE DAEMON] Write: missing required fields',
      headers: req.headers,
      bodyType: typeof req.body,
    });
    res.set('X-Errno', String(FuseCodes.EINVAL));
    res.send(Buffer.alloc(0));
    return;
  }

  const normalizedPath = ensureLeadingSlash(rawPath);

  logger.debug({
    msg: '[FUSE DAEMON] Write signal received',
    path: normalizedPath,
    offset,
    length: content.length,
  });

  const result = await write({ path: normalizedPath, content, offset, container });

  if (result.error) {
    res.set('X-Errno', String(result.error.code));
    res.send(Buffer.alloc(0));
    return;
  }

  res.set('X-Errno', '0');
  res.set('X-Written', String(result.data));
  res.send(Buffer.alloc(0));
}
