import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getAttributes } from '../../services/operations/get-attributes.service';
import { Request, Response } from 'express';
import { Container } from 'diod';

export async function getAttributesController(req: Request, res: Response, container: Container) {
  logger.debug({ msg: '[FUSE DAEMON] GetAttributes signal received' });
  const rawPath: string = req.body.path ?? '';
  const normalizedPath = rawPath === '' || rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const responseGetattr = await getAttributes(normalizedPath, container);
  if (responseGetattr.error) {
    logger.error({ msg: responseGetattr.error.message });
    res.status(404).send();
  } else {
    res.json(responseGetattr.data);
  }
}
