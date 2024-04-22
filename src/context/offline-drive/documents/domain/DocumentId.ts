import { Uuid } from '../../../shared/domain/value-objects/Uuid';

export class DocumentId extends Uuid {
  static create(): DocumentId {
    return new DocumentId(this.random().value);
  }
}
