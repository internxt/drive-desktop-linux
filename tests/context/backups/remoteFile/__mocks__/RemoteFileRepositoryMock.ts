import { AbsolutePath } from '../../../../../src/context/backups/localFile/infrastructure/AbsolutePath';
import { RemoteFile } from '../../../../../src/context/backups/remoteFile/domain/RemoteFile';
import { RemoteFileRepository } from '../../../../../src/context/backups/remoteFile/domain/RemoteFileRepository';

export class RemoteFileRepositoryMock implements RemoteFileRepository {
  private readonly uploadMock = jest.fn();

  upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<void> {
    return this.uploadMock(path, size, abortSignal);
  }

  assertHasBeenCalledWith(files: Array<RemoteFile>, signal: AbortSignal) {
    files.forEach((file) => {
      expect(this.uploadMock).toHaveBeenCalledWith(
        file.path,
        file.size,
        signal
      );
    });
  }
}
