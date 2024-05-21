import { RemoteFileSize } from '../../../../../src/context/backups/remoteFile/domain/RemoteFileSize';

export class RemoteFileSizeMother {
  static small(): RemoteFileSize {
    return new RemoteFileSize(RemoteFileSize.MAX_SMALL_FILE_SIZE);
  }
  static medium(): RemoteFileSize {
    return new RemoteFileSize(RemoteFileSize.MAX_MEDIUM_FILE_SIZE);
  }
  static big(): RemoteFileSize {
    return new RemoteFileSize(RemoteFileSize.MAX_MEDIUM_FILE_SIZE + 1);
  }
}
