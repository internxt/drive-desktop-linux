import { Service } from 'diod';
import Logger from 'electron-log';
import { DocumentRepository } from '../../domain/DocumentRepository';
import { DocumentPath } from '../../domain/DocumentPath';
import { DocumentUploaderFactory } from '../../domain/upload/DocumentUploaderFactory';
import { DocumentUploadedDomainEvent } from '../../domain/upload/DocumentUploadedDomainEvent';
import { EventBus } from '../../../../virtual-drive/shared/domain/EventBus';
import { Replaces } from '../../domain/upload/Replaces';

@Service()
export class DocumentUploader {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly uploaderFactory: DocumentUploaderFactory,
    private readonly eventBus: EventBus
  ) {}

  async run(path: string, replaces?: Replaces): Promise<string> {
    const documentPath = new DocumentPath(path);

    const documentOption = await this.repository.find(documentPath);

    if (!documentOption.isPresent()) {
      throw new Error(`Could not find ${path}`);
    }

    const document = documentOption.get();

    const stream = await this.repository.stream(documentPath);

    const controller = new AbortController();

    const stopWatching = this.repository.watchFile(documentPath, () =>
      controller.abort()
    );

    const uploader = this.uploaderFactory
      .read(stream)
      .document(document)
      .replaces(replaces)
      .abort(controller)
      .build();

    const contentsId = await uploader();

    stopWatching();

    Logger.debug(`${documentPath.value} uploaded with id ${contentsId}`);

    const contentsUploadedEvent = new DocumentUploadedDomainEvent({
      aggregateId: contentsId,
      size: document.size.value,
      path: document.path.value,
      replaces: replaces?.contentsId,
    });

    await this.eventBus.publish([contentsUploadedEvent]);

    return contentsId;
  }
}
