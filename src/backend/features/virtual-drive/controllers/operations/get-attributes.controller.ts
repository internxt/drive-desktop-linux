import { getAttributes } from '../../services/operations/get-attributes.service';
import { Request, Response } from 'express';
import { Container } from 'diod';
import { ensureLeadingSlash } from '../ensure-leading-slash';

export async function getAttributesController(req: Request, res: Response, container: Container) {
  const rawPath: string = req.body.path ?? '';
  const processName = typeof req.body.processName === 'string' ? req.body.processName : undefined;
  const normalizedPath = ensureLeadingSlash(rawPath);
  const result = await getAttributes(normalizedPath, container, processName);
  if (result.error) {
    res.json({ errno: result.error.code });
    return;
  }
  res.json({ errno: 0, ...result.data });
}
