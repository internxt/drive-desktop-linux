import CurrentLocalFilesProvider from '../../../../../src/context/local/localFile/application/CurrentLocalFilesProvider';
import { LocalFile } from '../../../../../src/context/local/localFile/domain/LocalFile';
import { LocalFileRepository } from '../../../../../src/context/local/localFile/domain/LocalFileRepository';
import { AbsolutePath } from '../../../../../src/context/local/localFile/infrastructure/AbsolutePath';
import { FilesIndexedByPath } from '../../../../../src/context/local/shared/application/FilesIndexedByPath';

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
