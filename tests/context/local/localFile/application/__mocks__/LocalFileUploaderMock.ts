import { LocalFileUploader } from '../../../../../../src/context/local/localFile/domain/LocalFileUploader';
import { AbsolutePath } from '../../../../../../src/context/local/localFile/infrastructure/AbsolutePath';

export class LocalFileUploaderMock implements LocalFileUploader {
  private readonly uploadMock = jest.fn();

  upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<string> {
    return this.uploadMock(path, size, abortSignal);
  }
}
