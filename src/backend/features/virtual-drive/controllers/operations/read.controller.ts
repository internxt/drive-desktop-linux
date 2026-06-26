import { Request, Response } from 'express';
import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { read } from '../../services/operations/read.service';
import { ensureLeadingSlash } from '../ensure-leading-slash';

export async function readController(req: Request, res: Response, container: Container) {
  const { path: rawPath, length, offset } = req.body;
  const processName = typeof req.body.processName === 'string' ? req.body.processName : '';

  if (!isValidReadPayload(rawPath, length, offset)) {
    logger.error({ msg: '[FUSE DAEMON] Read: invalid payload', body: req.body });
    res.set('X-Errno', String(FuseCodes.EINVAL));
    res.send(Buffer.alloc(0));
    return;
  }

  const normalizedPath = ensureLeadingSlash(rawPath);

  logger.debug({
    msg: `[FUSE DAEMON] Read signal received for path: ${normalizedPath} by process: ${processName} and length: ${length} offset: ${offset}`,
  });

  const result = await read(normalizedPath, length, offset, processName, container);

  if (result.error) {
    res.set('X-Errno', String(result.error.code));
    res.send(Buffer.alloc(0));
    return;
  }

  res.set('X-Errno', '0');
  res.set('Content-Type', 'application/octet-stream');
  res.send(result.data);
}

function isValidReadPayload(path: unknown, length: unknown, offset: unknown): boolean {
  if (typeof path !== 'string' || path.length === 0) return false;
  if (!isValidReadLength(length)) return false;
  if (!isValidReadOffset(offset)) return false;
  return true;
}

function isValidReadLength(length: unknown): length is number {
  if (typeof length !== 'number') return false;
  if (!Number.isInteger(length)) return false;
  if (length < 0) return false;
  return true;
}

function isValidReadOffset(offset: unknown): offset is number {
  if (typeof offset !== 'number') return false;
  if (!Number.isInteger(offset)) return false;
  if (offset < 0) return false;
  return true;
}
