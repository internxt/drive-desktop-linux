import { Service } from 'diod';
import { extname } from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { canGenerateThumbnail } from '../../../../../backend/features/thumbnails/thumbnail.extensions';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { TemporalFileUploaderFactory } from '../../domain/upload/TemporalFileUploaderFactory';
import { TemporalFileUploadedDomainEvent } from '../../domain/upload/TemporalFileUploadedDomainEvent';
import { EventBus } from '../../../../virtual-drive/shared/domain/EventBus';
import { Replaces } from '../../domain/upload/Replaces';
import { TemporalFile } from '../../domain/TemporalFile';
import { retryWithBackoff } from '../../../../../shared/retry-with-backoff';
import {
  createTransientErrorHandler,
  mapEnvironmentUploadError,
} from '../../../../shared/application/transient-error-handler';

@Service()
export class TemporalFileUploader {
  constructor(
    private readonly repository: TemporalFileRepository,
    private readonly uploaderFactory: TemporalFileUploaderFactory,
    private readonly eventBus: EventBus,
  ) {}

  async run(temporalFile: TemporalFile, replaces?: Replaces): Promise<string> {
    const controller = new AbortController();
    const stopWatching = this.repository.watchFile(temporalFile.path, () => controller.abort());

    try {
      const { data: contentsId, error } = await retryWithBackoff(
        async () => {
          const stream = await this.repository.stream(temporalFile.path);

          const uploader = this.uploaderFactory
            .read(stream)
            .document(temporalFile)
            .replaces(replaces)
            .abort(controller)
            .build();

          try {
            const uploadedContentsId = await uploader();
            return { data: uploadedContentsId };
          } catch (uploadError) {
            return { error: mapEnvironmentUploadError(uploadError as Error & { status?: unknown }) };
          }
        },
        createTransientErrorHandler({
          tag: 'SYNC-ENGINE',
          context: 'TEMPORAL FILE UPLOAD RETRY',
          path: temporalFile.path.value,
        }),
        controller.signal,
      );

      if (error) {
        throw error;
      }

      logger.debug({ msg: `${temporalFile.path.value} uploaded with id ${contentsId}` });

      const ext = extname(temporalFile.path.value).replace('.', '').toLowerCase();
      const fileBuffer = canGenerateThumbnail(ext) ? await this.repository.read(temporalFile.path) : undefined;

      const contentsUploadedEvent = new TemporalFileUploadedDomainEvent({
        aggregateId: contentsId,
        size: temporalFile.size.value,
        path: temporalFile.path.value,
        replaces: replaces?.contentsId,
        fileBuffer,
      });

      await this.eventBus.publish([contentsUploadedEvent]);

      return contentsId;
    } finally {
      stopWatching();
    }
  }
}
