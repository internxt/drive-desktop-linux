import { Request, Response } from 'express';
import { Container } from 'diod';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { utimens } from '../../services/operations/utimens.service';
import { ensureLeadingSlash } from '../ensure-leading-slash';

export async function utimensController(req: Request, res: Response, container: Container) {
  // Both fields are typed `unknown` because express types `req.body` as `any`,
  // so a declared `string` here would be a lie the compiler cannot catch: a
  // body of `{"path": 123}` would satisfy `?? ''`, reach ensureLeadingSlash and
  // throw on `.startsWith` instead of answering EINVAL.
  const rawPath: unknown = req.body?.path;
  const rawModificationTime: unknown = req.body?.modificationTime;

  const modificationTime =
    typeof rawModificationTime === 'string' ? new Date(rawModificationTime) : new Date(Number.NaN);

  if (typeof rawPath !== 'string' || !rawPath || Number.isNaN(modificationTime.getTime())) {
    res.json({ errno: FuseCodes.EINVAL });
    return;
  }

  const normalizedPath = ensureLeadingSlash(rawPath);
  const result = await utimens({ path: normalizedPath, modificationTime, container });

  if (result.error) {
    res.json({ errno: result.error.code });
    return;
  }

  res.json({ errno: 0 });
}
