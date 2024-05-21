import { AbsolutePath } from '../../../../../src/context/backups/localFile/infrastructure/AbsolutePath';
import { CurrentRemoteFilesProvider } from '../../../../../src/context/backups/remoteFile/application/CurrentRemoteFilesProvider';
import { RemoteFile } from '../../../../../src/context/backups/remoteFile/domain/RemoteFile';
import { FilesIndexedByPath } from '../../../../../src/context/backups/shared/application/FilesIndexedByPath';

export class CurrentRemoteFilesProviderTestClass extends CurrentRemoteFilesProvider {
  private readonly mock = jest.fn();

  constructor() {
    super();
  }

  run(folder: AbsolutePath): Promise<FilesIndexedByPath<RemoteFile>> {
    return this.mock(folder);
  }

  provide(files: FilesIndexedByPath<RemoteFile>) {
    this.mock.mockResolvedValueOnce(files);
  }

  assertHasBeenCalledWith(folder: AbsolutePath) {
    expect(this.mock).toHaveBeenCalledWith(folder);
  }
}
