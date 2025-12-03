import { StorageVirtualId } from '../StorageFiles/domain/StorageVirtualFileId';
import { UuidMother } from '../../../../tests/context/shared/domain/UuidMother';

export class StorageFileVirtualIdMother extends UuidMother {
  static random() {
    return UuidMother.random() as StorageVirtualId;
  }
}
