import { DomainEvent } from '../../../../shared/domain/DomainEvent';

export class TemporalFileUploadedDomainEvent extends DomainEvent {
  static readonly EVENT_NAME = 'offline-drive.temporal-file.uploaded';

  readonly size: number;
  readonly path: string;
  readonly replaces: string | undefined;
  readonly fileBuffer: Buffer | undefined;
  readonly contentFilePath: string | undefined;

  /**
   * The revision of the staged copy whose bytes this upload actually sent, read
   * immediately before the upload stream was opened rather than when this event
   * was built. Anything reaping the staged copy must compare against this, and
   * must treat any difference as "keep": the staged copy then holds bytes that
   * did not reach the cloud, and leaving it in place is what makes the next
   * release upload them.
   */
  readonly uploadedRevision: number | undefined;

  constructor({
    aggregateId,
    size,
    path,
    replaces,
    fileBuffer,
    contentFilePath,
    uploadedRevision,
  }: {
    aggregateId: string;
    size: number;
    path: string;
    replaces?: string;
    fileBuffer?: Buffer;
    contentFilePath?: string;
    uploadedRevision?: number;
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
    this.uploadedRevision = uploadedRevision;
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
