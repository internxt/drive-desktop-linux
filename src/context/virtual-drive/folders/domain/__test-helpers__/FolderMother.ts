import Chance from 'chance';
import { File } from '../../../files/domain/File';
import { Folder, FolderAttributes } from '../Folder';
import { FolderPath } from '../FolderPath';
import { FolderStatuses } from '../FolderStatus';
import { FolderUuid } from '../FolderUuid';
import { FolderPathMother } from './FolderPathMother';
import { UuidMother } from '../../../../shared/domain/__test-helpers__/UuidMother';

const chance = new Chance();

export class FolderMother {
  private static readonly MAX_ARRAY_GENERATION = 10;

  static containing(file: File) {
    return Folder.from({
      uuid: FolderUuid.random().value,
      path: file.dirname,
      parentUuid: file.folderUuid,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: FolderStatuses.EXISTS,
    });
  }

  static any() {
    return Folder.from({
      uuid: FolderUuid.random().value,
      path: FolderPathMother.any().value,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: FolderStatuses.EXISTS,
    });
  }

  static withUuid(folderUuid: string) {
    return Folder.from({
      uuid: folderUuid,
      path: '/Zodseve',
      parentUuid: UuidMother.primitive(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: FolderStatuses.EXISTS,
    });
  }

  static exists() {
    return Folder.from({
      uuid: FolderUuid.random().value,
      path: '/Zodseve',
      parentUuid: UuidMother.primitive(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: FolderStatuses.EXISTS,
    });
  }

  static trashed() {
    return Folder.from({
      uuid: FolderUuid.random().value,
      path: '/Zodseve',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: FolderStatuses.TRASHED,
    });
  }

  static root() {
    return Folder.from({
      uuid: FolderUuid.random().value,
      path: '/',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: FolderStatuses.EXISTS,
    });
  }

  static fromPartial(partial: Partial<FolderAttributes>) {
    const any = FolderMother.any();
    return Folder.from({ ...any.attributes(), ...partial });
  }

  static createChildForm(root: Folder) {
    return FolderMother.fromPartial({
      path: FolderPathMother.onFolder(new FolderPath(root.path)).value,
      parentUuid: root.uuid,
    });
  }

  static array(partial?: Partial<FolderAttributes>): Array<Folder> {
    return new Array(chance.integer({ min: 1, max: FolderMother.MAX_ARRAY_GENERATION }))
      .fill(0)
      .map(() => FolderMother.fromPartial(partial ?? {}));
  }
}
