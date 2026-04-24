import { Request, Response } from 'express';
import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { open } from '../../services/operations/open.service';
import { ensureLeadingSlash } from '../ensure-leading-slash';
import { fuseErrorToStatus } from '../fuse-error-to-status';

export async function openController(req: Request, res: Response, container: Container) {
  const rawPath: string = req.body.path ?? '';
  logger.debug({ msg: `[FUSE DAEMON] Open signal received for path: ${rawPath}` });
  const flags: number = req.body.flags ?? 0;
  const processName: string = req.body.processName ?? '';
  const normalizedPath = ensureLeadingSlash(rawPath);

  const result = await open(normalizedPath, flags, processName, container);

  if (result.error) {
    res.status(fuseErrorToStatus(result.error)).send();
    return;
  }

  res.status(200).send();
}
