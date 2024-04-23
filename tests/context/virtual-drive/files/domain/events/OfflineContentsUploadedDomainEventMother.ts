import { FileSizeMother } from '../FileSizeMother';
import { FilePathMother } from '../FilePathMother';
import { ContentsIdMother } from '../../../contents/domain/ContentsIdMother';
import { DocumentUploadedDomainEvent } from '../../../../../../src/context/offline-drive/documents/domain/upload/DocumentUploadedDomainEvent';

export class OfflineContentsUploadedDomainEventMother {
  static replacesContents(): DocumentUploadedDomainEvent {
    return new DocumentUploadedDomainEvent({
      aggregateId: ContentsIdMother.primitive(),
      size: FileSizeMother.random().value,
      path: FilePathMother.random().value,
      replaces: ContentsIdMother.primitive(),
    });
  }

  static doesNotReplace(): DocumentUploadedDomainEvent {
    return new DocumentUploadedDomainEvent({
      aggregateId: ContentsIdMother.primitive(),
      size: FileSizeMother.random().value,
      path: FilePathMother.random().value,
      replaces: undefined,
    });
  }
}
