import { Service } from 'diod';
import { extname } from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { canGenerateThumbnail } from '../../../../../backend/features/thumbnails/thumbnail.extensions';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { TemporalFilePath } from '../../domain/TemporalFilePath';
import { TemporalFileUploaderFactory } from '../../domain/upload/TemporalFileUploaderFactory';
import { TemporalFileUploadedDomainEvent } from '../../domain/upload/TemporalFileUploadedDomainEvent';
import { EventBus } from '../../../../virtual-drive/shared/domain/EventBus';
import { Replaces } from '../../domain/upload/Replaces';
import { TemporalFile } from '../../domain/TemporalFile';

@Service()
export class TemporalFileUploader {
  constructor(
    private readonly repository: TemporalFileRepository,
    private readonly uploaderFactory: TemporalFileUploaderFactory,
    private readonly eventBus: EventBus,
  ) {}

  async run(temporalFile: TemporalFile, replaces?: Replaces): Promise<string> {

    const stream = await this.repository.stream(temporalFile.path);

    const controller = new AbortController();

    const stopWatching = this.repository.watchFile(temporalFile.path, () => controller.abort());

    const uploader = this.uploaderFactory
      .read(stream)
      .document(temporalFile)
      .replaces(replaces)
      .abort(controller)
      .build();

    const contentsId = await uploader();

    stopWatching();

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
  }
}
