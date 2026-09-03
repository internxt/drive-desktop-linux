import { Service } from 'diod';
import { extname } from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { canGenerateThumbnail } from '../../../../../backend/features/thumbnails/thumbnail.extensions';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { TemporalFileUploaderFactory } from '../../domain/upload/TemporalFileUploaderFactory';
import { TemporalFileUploadedDomainEvent } from '../../domain/upload/TemporalFileUploadedDomainEvent';
import { TemporalFileUploadSnapshot } from '../../domain/upload/TemporalFileUploadSnapshot';
import { EventBus } from '../../../../virtual-drive/shared/domain/EventBus';
import { Replaces } from '../../domain/upload/Replaces';
import { TemporalFile } from '../../domain/TemporalFile';
import { retryWithBackoff } from '../../../../../shared/retry-with-backoff';
import {
  createTransientErrorHandler,
  mapEnvironmentUploadError,
} from '../../../../../backend/common/rate-limit/transient-error-handler';
import { ContentsId } from '../../../../../apps/main/database/entities/DriveFile';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { Result } from '../../../../shared/domain/Result';
import configStore from '../../../../../apps/main/config';
import { addMaxFileSizeRejection } from '../../../../../backend/features/user/file-size-limit/add-max-file-size-rejection';
import { UploadSizeLimitError } from '../../../../../backend/features/user/file-size-limit/upload-size-limit-error';
import { validateUploadFileSize } from '../../../../../backend/features/user/file-size-limit/validate-upload-file-size';
import { validateSpace } from '../../../../../backend/features/usage/validate-space';

@Service()
export class TemporalFileUploader {
  private static readonly EMPTY_CONTENTS_ID = '' as ContentsId;

  constructor(
    private readonly repository: TemporalFileRepository,
    private readonly uploaderFactory: TemporalFileUploaderFactory,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Uploads a temporal file's contents and publishes the event that creates or
   * overrides the drive file.
   *
   * The bytes are bounded by a descriptor opened here, so the length declared to
   * the server bounds the body sent to it even while the application keeps
   * writing to the file it knows about.
   *
   * @param replaces the existing drive file this upload overrides, if any.
   * @returns the contents id of the stored object, or an empty one for a file of zero bytes.
   * @throws UploadSizeLimitError, or DriveDesktopError for space, abort and upload failures.
   */
  async run(temporalFile: TemporalFile, replaces?: Replaces): Promise<ContentsId> {
    if (temporalFile.isEmpty()) {
      logger.debug({
        msg: '[TemporalFileUploader] Skipping upload for empty temporal file',
        path: temporalFile.path.value,
      });

      await this.publishUploadEvent(
        TemporalFileUploader.EMPTY_CONTENTS_ID,
        temporalFile,
        temporalFile.size.value,
        replaces,
      );

      return TemporalFileUploader.EMPTY_CONTENTS_ID;
    }

    // Cheap pre-check against the recorded size, so a file already known to be
    // too big is rejected before anything is opened.
    await this.validateLimits(temporalFile, temporalFile.size.value);

    const controller = new AbortController();
    const stopWatching = this.repository.watchFile(temporalFile.path, () => controller.abort());

    let snapshot: TemporalFileUploadSnapshot | undefined;

    try {
      // Watching starts first so that a write landing while the length is
      // taken still aborts the upload instead of being frozen into it.
      snapshot = await this.repository.createUploadSnapshot(temporalFile.path);

      // The descriptor's length is what will actually be sent, and it can be
      // larger than the size checked above, so the limits are its to satisfy.
      await this.validateLimits(temporalFile, snapshot.size);

      const contentsId = await this.uploadWithRetry(temporalFile, snapshot, controller, replaces);

      logger.debug({ msg: `${temporalFile.path.value} uploaded with id ${contentsId}` });

      await this.publishUploadEvent(contentsId, temporalFile, snapshot.size, replaces);

      return contentsId;
    } finally {
      // Neither of these may replace what the upload itself produced: a failed
      // cleanup after a committed upload would report EIO for work that was
      // already done, and would hide the real error after a failed one.
      await this.release(stopWatching, snapshot);
    }
  }

  /**
   * Rejects an upload that the user's plan or remaining space cannot take.
   *
   * @param size bytes the upload would send, which is the recorded size before a
   * snapshot exists and the snapshot's own size once one does.
   * @throws UploadSizeLimitError when the file exceeds the account's per-file limit.
   * @throws DriveDesktopError NOT_ENOUGH_SPACE, or BAD_RESPONSE if the check itself failed.
   */
  private async validateLimits(temporalFile: TemporalFile, size: number): Promise<void> {
    const sizeValidation = validateUploadFileSize({
      size,
      maxUploadFileSize: configStore.get('maxUploadFileSizeInBytes'),
    });

    if (!sizeValidation.allowed) {
      addMaxFileSizeRejection({
        path: temporalFile.path.value,
        fileSize: size,
        validation: sizeValidation,
      });

      throw new UploadSizeLimitError();
    }

    const spaceValidation = await validateSpace(size);
    if (spaceValidation.error) {
      throw new DriveDesktopError('BAD_RESPONSE', spaceValidation.error.message);
    }

    if (spaceValidation.data.hasSpace === false) {
      throw new DriveDesktopError(
        'NOT_ENOUGH_SPACE',
        'The size of the file to upload is greater than the available space',
      );
    }
  }

  /**
   * Closes the watcher and the upload's descriptor.
   *
   * Neither failure may escape: after a committed upload it would report work
   * that was already done as failed, and after a failed one it would hide the
   * error the caller needs.
   */
  private async release(stopWatching: () => void, snapshot?: TemporalFileUploadSnapshot): Promise<void> {
    try {
      stopWatching();
    } catch (error) {
      logger.warn({ msg: '[TemporalFileUploader] Could not stop watching the temporal file', error });
    }

    if (!snapshot) {
      return;
    }

    try {
      await snapshot.dispose();
    } catch (error) {
      logger.warn({ msg: '[TemporalFileUploader] Could not close the upload snapshot', error });
    }
  }

  private async uploadWithRetry(
    temporalFile: TemporalFile,
    snapshot: TemporalFileUploadSnapshot,
    controller: AbortController,
    replaces?: Replaces,
  ): Promise<ContentsId> {
    const errorHandler = createTransientErrorHandler({
      tag: 'SYNC-ENGINE',
      context: 'TEMPORAL FILE UPLOAD RETRY',
      path: temporalFile.path.value,
    });

    const { data: contentsId, error } = await retryWithBackoff(
      () => this.executeUpload(temporalFile, snapshot, controller, replaces),
      errorHandler,
      controller.signal,
    );

    if (error) throw error;

    return contentsId;
  }

  private async executeUpload(
    temporalFile: TemporalFile,
    snapshot: TemporalFileUploadSnapshot,
    controller: AbortController,
    replaces?: Replaces,
  ): Promise<Result<ContentsId, DriveDesktopError>> {
    // A consumed stream cannot be reused, so each attempt opens a new one - over
    // the same bounded descriptor, so no attempt exceeds the declared length.
    const stream = snapshot.open();

    try {
      const uploader = this.uploaderFactory
        .read(stream)
        .document(temporalFile)
        .replaces(replaces)
        .abort(controller)
        .build(snapshot.size);

      const uploadedContentsId = await uploader();
      return { data: uploadedContentsId as ContentsId };
    } catch (uploadError) {
      return {
        error: mapEnvironmentUploadError(uploadError as Error & { status?: unknown }),
      };
    } finally {
      // A stream left undrained would keep its generator alive until the
      // handle closed under it. The uploader destroys the stream on its own
      // abort and error paths, so this is a no-op except when build() itself
      // throws. It cannot close the descriptor: the stream does not own it.
      if (!stream.destroyed) {
        stream.destroy();
      }
    }
  }

  private async publishUploadEvent(
    contentsId: ContentsId,
    temporalFile: TemporalFile,
    uploadedSize: number,
    replaces?: Replaces,
  ): Promise<void> {
    const fileBuffer = await this.getThumbnailBufferIfNeeded(temporalFile);

    const contentsUploadedEvent = new TemporalFileUploadedDomainEvent({
      aggregateId: contentsId,
      // The size the drive records has to be the number of bytes that were
      // stored, which is the snapshot's, not the one read before the upload.
      size: uploadedSize,
      path: temporalFile.path.value,
      replaces: replaces?.contentsId,
      fileBuffer,
      contentFilePath: temporalFile.contentFilePath,
    });

    await this.eventBus.publish([contentsUploadedEvent]);
  }

  private async getThumbnailBufferIfNeeded(temporalFile: TemporalFile): Promise<Buffer | undefined> {
    if (temporalFile.isEmpty()) {
      return undefined;
    }

    const ext = extname(temporalFile.path.value).replace('.', '').toLowerCase();

    if (!canGenerateThumbnail(ext)) {
      return undefined;
    }

    return this.repository.read(temporalFile.path);
  }
}
