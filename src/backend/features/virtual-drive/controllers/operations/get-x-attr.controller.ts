import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getXAttr } from '../../services/operations/get-x-attr.service';
import { Request, Response } from 'express';
import { Container } from 'diod';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';

function mapFuseCodeToStatus(code: number) {
  switch (code) {
    case FuseCodes.ENOENT:
      return 404;
    case FuseCodes.ENOSYS:
      return 501;
    default:
      return 500;
  }
}

export async function getXAttrController(req: Request, res: Response, container: Container) {
  logger.debug({ msg: '[FUSE DAEMON] GetXAttr signal received' });
  const rawPath: string = req.body.path ?? '';
  const normalizedPath = rawPath === '' || rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const attr: string = req.body.attr ?? '';
  const responseGetXAttr = await getXAttr(normalizedPath, attr, container);

  if (responseGetXAttr.error) {
    logger.error({ msg: responseGetXAttr.error.message, code: responseGetXAttr.error.code });
    res.status(mapFuseCodeToStatus(responseGetXAttr.error.code)).send();
    return;
  }

  res.json(responseGetXAttr.data);
}