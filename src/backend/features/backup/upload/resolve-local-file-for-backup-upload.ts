import { logger } from '@internxt/drive-desktop-core/build/backend';
import { LocalFile } from '../../../../context/local/localFile/domain/LocalFile';
import { Result } from '../../../../context/shared/domain/Result';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { safeStat } from '../../../../infra/local-file-system/safe-stat';
import { contentTimestampsFromStats } from '../../../../shared/content-timestamps/content-timestamps-from-stats';

type Props = { localFile: LocalFile };

export type ResolvedLocalFileForBackupUpload = {
  path: string;
  size: number;
  modificationTime: Date;
  creationTime: Date;
};

export type ResolveLocalFileForBackupUploadResult =
  | { kind: 'ready'; upload: ResolvedLocalFileForBackupUpload }
  | { kind: 'deferred' };

export async function resolveLocalFileForBackupUpload({
  localFile,
}: Props): Promise<Result<ResolveLocalFileForBackupUploadResult, DriveDesktopError>> {
  const firstRead = await readLocalFileState(localFile.path);
  if (firstRead.error) {
    return { error: firstRead.error };
  }

  const changedSinceScan =
    firstRead.data.size !== localFile.size || firstRead.data.modificationTimeMs !== localFile.modificationTime;

  if (changedSinceScan) {
    logger.debug({
      tag: 'BACKUPS',
      msg: 'Local file changed since tree scan; re-checking before upload',
      path: localFile.path,
      scannedSize: localFile.size,
      currentSize: firstRead.data.size,
      scannedModificationTime: localFile.modificationTime,
      currentModificationTime: firstRead.data.modificationTimeMs,
    });

    const secondRead = await readLocalFileState(localFile.path);
    if (secondRead.error) {
      return { error: secondRead.error };
    }

    const stillChanging =
      secondRead.data.size !== firstRead.data.size ||
      secondRead.data.modificationTimeMs !== firstRead.data.modificationTimeMs;

    if (stillChanging) {
      logger.debug({
        tag: 'BACKUPS',
        msg: 'Deferring backup upload until the file stops changing',
        path: localFile.path,
      });
      return { data: { kind: 'deferred' } };
    }

    return {
      data: {
        kind: 'ready',
        upload: toResolvedUpload(localFile.path, secondRead.data),
      },
    };
  }

  return {
    data: {
      kind: 'ready',
      upload: toResolvedUpload(localFile.path, firstRead.data),
    },
  };
}

type LocalFileStateRead = {
  size: number;
  modificationTimeMs: number;
  modificationTime: Date;
  creationTime: Date;
};

async function readLocalFileState(
  absolutePath: string,
): Promise<Result<LocalFileStateRead, DriveDesktopError>> {
  const { data: stats, error } = await safeStat(absolutePath);
  if (error) {
    return { error };
  }

  if (!stats.isFile()) {
    return { error: new DriveDesktopError('NOT_EXISTS', `Expected a file at ${absolutePath}`) };
  }

  const { modificationTime, creationTime } = contentTimestampsFromStats(stats);

  return {
    data: {
      size: stats.size,
      modificationTimeMs: modificationTime.getTime(),
      modificationTime,
      creationTime,
    },
  };
}

function toResolvedUpload(path: string, state: LocalFileStateRead): ResolvedLocalFileForBackupUpload {
  return {
    path,
    size: state.size,
    modificationTime: state.modificationTime,
    creationTime: state.creationTime,
  };
}