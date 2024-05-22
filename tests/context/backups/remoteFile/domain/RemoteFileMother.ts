import {
  RemoteFile,
  RemoteFileAttributes,
} from '../../../../../src/context/local/remoteFile/domain/RemoteFile';
import { DateMother } from '../../../shared/domain/DateMother';
import { AbsolutePathMother } from '../../../shared/infrastructure/AbsolutePathMother';
import Chance from '../../../shared/infrastructure/Chance';

export class RemoteFileMother {
  static any(): RemoteFile {
    return RemoteFile.from({
      path: AbsolutePathMother.anyFile(),
      modificationTime: DateMother.today().getTime(),
      size: Chance.integer({ min: 1, max: 10_000 }),
    });
  }

  static fromPartial(partial: Partial<RemoteFileAttributes>): RemoteFile {
    return RemoteFile.from({
      ...RemoteFileMother.any().attributes(),
      ...partial,
    });
  }

  static array(
    numberOfElements: number,
    generator?: (position: number) => Partial<RemoteFileAttributes>
  ): Array<RemoteFile> {
    const array = [];

    for (let i = 0; i < numberOfElements; i++) {
      array.push(RemoteFileMother.fromPartial(generator ? generator(i) : {}));
    }

    return array;
  }
}
