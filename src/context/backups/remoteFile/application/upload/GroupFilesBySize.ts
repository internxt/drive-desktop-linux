import { RemoteFile } from '../../domain/RemoteFile';

export class GroupFilesBySize {
  static small(files: Array<RemoteFile>) {
    return files.filter((file) => file.isSmall());
  }

  static medium(files: Array<RemoteFile>) {
    return files.filter((file) => file.isMedium());
  }

  static big(files: Array<RemoteFile>) {
    return files.filter((file) => file.isBig());
  }
}
