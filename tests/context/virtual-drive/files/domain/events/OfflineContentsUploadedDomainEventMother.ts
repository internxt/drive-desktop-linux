import { FileSizeMother } from '../FileSizeMother';
import { FilePathMother } from '../FilePathMother';
import { ContentsIdMother } from '../../../contents/domain/ContentsIdMother';
import { TemporalFileUploadedDomainEvent } from '../../../../../../src/context/offline-drive/TemporalFiles/domain/upload/TemporalFileUploadedDomainEvent';

export class OfflineContentsUploadedDomainEventMother {
  static replacesContents(): TemporalFileUploadedDomainEvent {
    return new TemporalFileUploadedDomainEvent({
      aggregateId: ContentsIdMother.primitive(),
      size: FileSizeMother.random().value,
      path: FilePathMother.random().value,
      replaces: ContentsIdMother.primitive(),
    });
  }

  static doesNotReplace(): TemporalFileUploadedDomainEvent {
    return new TemporalFileUploadedDomainEvent({
      aggregateId: ContentsIdMother.primitive(),
      size: FileSizeMother.random().value,
      path: FilePathMother.random().value,
      replaces: undefined,
    });
  }
}
