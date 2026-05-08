import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type Result } from '../../../../../context/shared/domain/Result';
import { FuseError, FuseIOError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { TemporalFileRepository } from '../../../../../context/storage/TemporalFiles/domain/TemporalFileRepository';

export type StatFsResult = {
  blocks: number;
  bfree: number;
  bavail: number;
  files: number;
  ffree: number;
  bsize: number;
};

type Props = {
  container: Container;
};

export async function statfs({ container }: Props): Promise<Result<StatFsResult, FuseError>> {
  try {
    const stats = await container.get(TemporalFileRepository).statFs();
    return { data: stats };
  } catch (err) {
    logger.error({ msg: '[StatFs] Failed to read filesystem stats', error: err });
    return { error: new FuseIOError('Failed to read filesystem stats') };
  }
}
