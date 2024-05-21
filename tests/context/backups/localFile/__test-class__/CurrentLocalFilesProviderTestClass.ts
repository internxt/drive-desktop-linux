import CurrentLocalFilesProvider from '../../../../../src/context/backups/localFile/application/CurrentLocalFilesProvider';
import { LocalFile } from '../../../../../src/context/backups/localFile/domain/LocalFile';
import { LocalFileRepository } from '../../../../../src/context/backups/localFile/domain/LocalFileRepository';
import { AbsolutePath } from '../../../../../src/context/backups/localFile/infrastructure/AbsolutePath';
import { FilesIndexedByPath } from '../../../../../src/context/backups/shared/application/FilesIndexedByPath';

export class CurrentLocalFilesProviderTestClass extends CurrentLocalFilesProvider {
  private readonly mock = jest.fn();

  constructor() {
    super({} as LocalFileRepository);
  }

  run(folder: AbsolutePath): Promise<FilesIndexedByPath<LocalFile>> {
    return this.mock(folder);
  }

  assertHasBeenCalledWith(folder: AbsolutePath) {
    expect(this.mock).toHaveBeenCalledWith(folder);
  }

  provide(files: FilesIndexedByPath<LocalFile>) {
    this.mock.mockResolvedValueOnce(files);
  }
}
