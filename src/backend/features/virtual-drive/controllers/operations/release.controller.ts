import { Request, Response } from 'express';
import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { release } from '../../services/operations/release.service';
import { ensureLeadingSlash } from '../ensure-leading-slash';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileDeleter } from '../../../../../context/storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { TemporalFileUploadQueue } from '../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploadQueue/types';

export async function releaseController(req: Request, res: Response, container: Container) {
  const rawPath: string = req.body.path ?? '';
  const processName: string = req.body.processName ?? '';
  logger.debug({
    msg: `[FUSE DAEMON] Release signal received for path: ${rawPath} by process: ${processName}`,
  });
  const normalizedPath = ensureLeadingSlash(rawPath);
  const finder = container.get(TemporalFileByPathFinder);
  const deleter = container.get(TemporalFileDeleter);
  const uploadQueue = container.get(TemporalFileUploadQueue);

  const result = await release({
    path: normalizedPath,
    processName,
    findTemporalFileByPath: finder.run.bind(finder),
    deleteTemporalFile: deleter.run.bind(deleter),
    enqueueTemporalFile: uploadQueue.enqueue.bind(uploadQueue),
  });

  if (result.error) {
    res.json({ errno: result.error.code });
    return;
  }

  res.json({ errno: 0 });
}
