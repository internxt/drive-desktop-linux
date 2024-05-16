import {
  LocalFile,
  LocalFileAttributes,
} from '../../../../../src/context/local/localFile/domain/LocalFile';
import { DateMother } from '../../../shared/domain/DateMother';
import { AbsolutePathMother } from '../../../shared/infrastructure/AbsolutePathMother';
import Chance from '../../../shared/infrastructure/Chance';

export class LocalFileMother {
  static any(): LocalFile {
    return LocalFile.from({
      path: AbsolutePathMother.anyFolder(),
      modifiedTime: DateMother.today().getTime(),
      size: Chance.integer({ min: 1 }),
    });
  }

  static fromPartial(partial?: Partial<LocalFileAttributes>): LocalFile {
    const random = LocalFileMother.any();

    if (!partial) {
      return random;
    }

    return LocalFile.from({
      ...(random.attributes() as LocalFileAttributes),
      ...partial,
    });
  }
}
