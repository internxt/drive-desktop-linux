import { AbsolutePath } from '../../../../../src/context/local/localFile/infrastructure/AbsolutePath';
import { RemoteFile } from '../../../../../src/context/local/remoteFile/domain/RemoteFile';
import { LocalFileSystem } from '../../../../../src/context/local/localFile/domain/LocalFileUploader';

export class LocalFileUploaderMock implements LocalFileSystem {
  private readonly uploadMock = jest.fn();

  upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<string> {
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
