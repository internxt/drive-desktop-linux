import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getAttributes } from '../../services/operations/get-attributes.service';
import { Request, Response } from 'express';
import { Container } from 'diod';
import { ensureLeadingSlash } from '../ensure-leading-slash';

export async function getAttributesController(req: Request, res: Response, container: Container) {
  logger.debug({ msg: '[FUSE DAEMON] GetAttributes signal received' });
  const rawPath: string = req.body.path ?? '';
  const normalizedPath = ensureLeadingSlash(rawPath);
  const result = await getAttributes(normalizedPath, container);
  if (result.error) {
    logger.error({ msg: result.error.message });
    res.json({ errno: result.error.code });
    return;
  }
  res.json({ errno: 0, ...result.data });
}
