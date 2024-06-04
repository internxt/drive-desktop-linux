import { LocalFileHandler } from '../../../../../../src/context/local/localFile/domain/LocalFileUploader';
import { AbsolutePath } from '../../../../../../src/context/local/localFile/infrastructure/AbsolutePath';

export class LocalFileUploaderMock implements LocalFileHandler {
  private readonly uploadMock = jest.fn();
  private readonly deleteMock = jest.fn();

  upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<string> {
    return this.uploadMock(path, size, abortSignal);
  }

  delete(contentsId: string): Promise<void> {
    return this.deleteMock(contentsId);
  }
}
