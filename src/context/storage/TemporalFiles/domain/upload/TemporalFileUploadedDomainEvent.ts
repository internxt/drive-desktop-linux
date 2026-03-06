import { DomainEvent } from '../../../../shared/domain/DomainEvent';

export class TemporalFileUploadedDomainEvent extends DomainEvent {
  static readonly EVENT_NAME = 'offline-drive.temporal-file.uploaded';

  readonly size: number;
  readonly path: string;
  readonly replaces: string | undefined;
  readonly fileBuffer: Buffer | undefined;

  constructor({
    aggregateId,
    size,
    path,
    replaces,
    fileBuffer,
  }: {
    aggregateId: string;
    size: number;
    path: string;
    replaces?: string;
    fileBuffer?: Buffer;
  }) {
    super({
      aggregateId,
      eventName: TemporalFileUploadedDomainEvent.EVENT_NAME,
    });

    this.size = size;
    this.path = path;
    this.replaces = replaces;
    this.fileBuffer = fileBuffer;
  }

  toPrimitives() {
    return {
      aggregateId: this.aggregateId,
      size: this.size,
      path: this.path,
      replaces: this.replaces,
    };
  }
}
