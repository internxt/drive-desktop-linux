import { LocalFile } from '../../../../../src/context/local/localFile/domain/LocalFile';
import { AbsolutePath } from '../../../../../src/context/local/localFile/infrastructure/AbsolutePath';
import { RemoteFile } from '../../../../../src/context/local/remoteFile/domain/RemoteFile';
import { DiffFilesCalculator } from '../../../../../src/apps/backups/diff/DiffFilesCalculator';
import { AbsolutePathMother } from '../../../shared/infrastructure/AbsolutePathMother';
import { CurrentLocalFilesProviderTestClass } from '../../localFile/__test-class__/CurrentLocalFilesProviderTestClass';
import { LocalFileMother } from '../../localFile/domain/LocalFileMother';
import { CurrentRemoteFilesProviderTestClass } from '../../remoteFile/__test-class__/CurrentRemoteFilesProviderTestClass';
import { RemoteFileMother } from '../../remoteFile/domain/RemoteFileMother';

describe('DiffFilesCalculator', () => {
  let SUT: DiffFilesCalculator;

  let localFilesProvider: CurrentLocalFilesProviderTestClass;
  let remoteFilesProvider: CurrentRemoteFilesProviderTestClass;

  beforeAll(() => {
    localFilesProvider = new CurrentLocalFilesProviderTestClass();
    remoteFilesProvider = new CurrentRemoteFilesProviderTestClass();

    SUT = new DiffFilesCalculator(localFilesProvider, remoteFilesProvider);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function indexByPath<T extends { path: string }>(
    array: Array<T>
  ): Map<AbsolutePath, T> {
    return array.reduce((accumulator, element) => {
      accumulator.set(element.path, element);

      return accumulator;
    }, new Map());
  }

  it('groups all local files not in remote as added', async () => {
    const folder = AbsolutePathMother.anyFolder();

    const filesInLocal = LocalFileMother.array(5);
    const filesInRemote: Array<RemoteFile> = [];

    localFilesProvider.provide(indexByPath(filesInLocal));
    remoteFilesProvider.provide(indexByPath(filesInRemote));

    const { added } = await SUT.run(folder);

    expect(added).toEqual(filesInLocal);
  });

  it('groups all remote files not in local as deleted', async () => {
    const folder = AbsolutePathMother.anyFolder();

    const filesInLocal: Array<LocalFile> = [];
    const filesInRemote = RemoteFileMother.array(5);

    localFilesProvider.provide(indexByPath(filesInLocal));
    remoteFilesProvider.provide(indexByPath(filesInRemote));

    const { deleted } = await SUT.run(folder);

    expect(deleted).toEqual(filesInRemote);
  });

  it('groups all local files with different modification time than its remote as modified', async () => {
    const folder = AbsolutePathMother.anyFolder();

    const filesInLocal = LocalFileMother.array(5);
    const filesInRemote = RemoteFileMother.array(5, (position) => {
      const local = filesInLocal[position];

      return {
        path: local.path,
        modificationTime: local.modificationTime + 1,
      };
    });

    const expected = filesInLocal.map((local) => {
      const remote = filesInRemote.find(
        ({ path }) => path === local.path
      ) as RemoteFile;

      return [remote, local];
    });

    localFilesProvider.provide(indexByPath(filesInLocal));
    remoteFilesProvider.provide(indexByPath(filesInRemote));

    const { modified } = await SUT.run(folder);

    expect(modified).toEqual(expected);
  });
});
