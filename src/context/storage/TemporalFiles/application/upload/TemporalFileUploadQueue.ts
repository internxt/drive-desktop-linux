import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../../../core/electron/paths';
import { TemporalFileDeleter } from '../deletion/TemporalFileDeleter';
import { TemporalFile } from '../../domain/TemporalFile';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { TemporalFileUploader } from './TemporalFileUploader';
import { FirstsFileSearcher } from '../../../../virtual-drive/files/application/search/FirstsFileSearcher';
import { FileStatuses } from '../../../../virtual-drive/files/domain/FileStatus';
import { preserveRejectedFileSizeTooBig } from '../../../../../backend/features/user/file-size-limit';
import { UploadSizeLimitError } from '../../../../../backend/features/user/file-size-limit/upload-size-limit-error';

type Props = {
  temporalFile: TemporalFile;
  path: string;
  processName: string;
};

type UploadTask = {
  temporalFile: TemporalFile;
  path: string;
  processName: string;
};

type FactoryProps = {
  repository: TemporalFileRepository;
  uploader: TemporalFileUploader;
  deleter: TemporalFileDeleter;
  fileSearcher: FirstsFileSearcher;
};

export const TemporalFileUploadQueue = Symbol('TemporalFileUploadQueue');

export type TemporalFileUploadQueue = ReturnType<typeof createTemporalFileUploadQueue>;

export function createTemporalFileUploadQueue({ repository, uploader, deleter, fileSearcher }: FactoryProps) {
  const queuedPaths = new Set<string>();
  const tasks: UploadTask[] = [];
  let draining = false;

  async function enqueue({ temporalFile, path, processName }: Props) {
    if (queuedPaths.has(path)) {
      logger.debug({ msg: '[UploadQueue] Path already queued', path, processName });
      return;
    }

    const stagedTemporalFile = await repository.stage(temporalFile.path, PATHS.UPLOAD_QUEUE);

    tasks.push({
      temporalFile: stagedTemporalFile,
      path,
      processName,
    });
    queuedPaths.add(path);

    void drain();
  }

  async function drain() {
    if (draining) {
      return;
    }

    draining = true;

    try {
      while (tasks.length > 0) {
        const task = tasks[0];

        try {
          await upload(task);
          await deleter.run(task.path);
        } catch (error) {
          if (error instanceof UploadSizeLimitError) {
            await preserveRejected(task);
          } else {
            logger.error({ msg: '[UploadQueue] Upload failed, keeping staged file in queue folder', error, path: task.path });
          }
        } finally {
          tasks.shift();
          queuedPaths.delete(task.path);
        }
      }
    } finally {
      draining = false;
    }
  }

  async function upload(task: UploadTask) {
    const existingFile = await fileSearcher.run({ path: task.path, status: FileStatuses.EXISTS });
    const replaces = existingFile
      ? { contentsId: existingFile.contentsId, name: existingFile.name, extension: existingFile.type }
      : undefined;

    await uploader.run(task.temporalFile, replaces);

    logger.debug({ msg: '[UploadQueue] Upload completed', path: task.path, processName: task.processName });
  }

  async function preserveRejected(task: UploadTask) {
    if (!task.temporalFile.contentFilePath) {
      logger.warn({ msg: '[UploadQueue] Rejected file missing content path', path: task.path });
      return;
    }

    const { error } = await preserveRejectedFileSizeTooBig({
      originalPath: task.path,
      temporalContentPath: task.temporalFile.contentFilePath,
      size: task.temporalFile.size.value,
    });

    if (error) {
      logger.error({ msg: '[UploadQueue] Failed to preserve oversized file', error, path: task.path });
      return;
    }

    await deleter.run(task.path);

    logger.warn({ msg: '[UploadQueue] Preserved oversized file after queue rejection', path: task.path });
  }

  return {
    enqueue,
  };
}
