import { DomainEvent } from '../../../../shared/domain/DomainEvent';

export class TemporalFileUploadedDomainEvent extends DomainEvent {
  static readonly EVENT_NAME = 'offline-drive.temporal-file.uploaded';

  readonly size: number;
  readonly path: string;
  readonly replaces: string | undefined;
  readonly fileBuffer: Buffer | undefined;
  readonly contentFilePath: string | undefined;

  /**
   * The staged copy's modification time as it was when the upload read it, not
   * when this event was built. Anything reaping the staged copy must compare
   * against this: a write that lands while the upload is streaming has a
   * modification time earlier than the event, and its bytes may not be in the
   * uploaded object.
   */
  readonly uploadedModifiedTime: Date | undefined;

  constructor({
    aggregateId,
    size,
    path,
    replaces,
    fileBuffer,
    contentFilePath,
    uploadedModifiedTime,
  }: {
    aggregateId: string;
    size: number;
    path: string;
    replaces?: string;
    fileBuffer?: Buffer;
    contentFilePath?: string;
    uploadedModifiedTime?: Date;
  }) {
    super({
      aggregateId,
      eventName: TemporalFileUploadedDomainEvent.EVENT_NAME,
    });

    this.size = size;
    this.path = path;
    this.replaces = replaces;
    this.fileBuffer = fileBuffer;
    this.contentFilePath = contentFilePath;
    this.uploadedModifiedTime = uploadedModifiedTime;
  }

  toPrimitives() {
    return {
      aggregateId: this.aggregateId,
      size: this.size,
      path: this.path,
      replaces: this.replaces,
      contentFilePath: this.contentFilePath,
    };
  }
}
