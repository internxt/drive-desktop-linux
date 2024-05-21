import CurrentLocalFilesProvider from '../../../../../src/context/backups/localFile/application/CurrentLocalFilesProvider';
import { AbsolutePathMother } from '../../../shared/infrastructure/AbsolutePathMother';
import { LocalFileRepositoryMock } from '../__mocks__/LocalFileRepositoryMock';
import { LocalFileMother } from '../domain/LocalFileMother';

describe('GenerateCurrentLocalFiles', () => {
  let SUT: CurrentLocalFilesProvider;

  let repository: LocalFileRepositoryMock;

  beforeAll(() => {
    repository = new LocalFileRepositoryMock();

    SUT = new CurrentLocalFilesProvider(repository);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('obtains the files for the given folder', async () => {
    const folder = AbsolutePathMother.anyFolder();

    repository.withOutFolders();

    await SUT.run(folder);

    repository.assertFilesHasBeenCalledWith(folder);
  });

  it('returns an array that contains the files of the given folder', async () => {
    const folder = AbsolutePathMother.anyFolder();
    const fileFounded = LocalFileMother.any();

    repository.returnsFiles(fileFounded);
    repository.withOutFolders();

    const result = await SUT.run(folder);

    expect(result).toEqual([fileFounded]);
  });

  it('obtains the subfolders for the given folder', async () => {
    const folder = AbsolutePathMother.anyFolder();

    repository.withOutFolders();

    await SUT.run(folder);

    repository.assertFoldersHasBeenCalledWith(folder);
  });

  it('obtains the files of a subfolder', async () => {
    const folder = AbsolutePathMother.anyFolder();

    repository.returnsFolders([AbsolutePathMother.anyFolder()]);
    const fileFounded = LocalFileMother.any();

    repository.returnsFiles([]);
    repository.returnsFiles(fileFounded);

    const result = await SUT.run(folder);

    expect(result).toEqual([fileFounded]);
  });

  it('obtains the files of a subfolder folder', async () => {
    const folder = AbsolutePathMother.anyFolder();

    repository.returnsFolders([AbsolutePathMother.anyFolder()]);
    repository.returnsFolders([AbsolutePathMother.anyFolder()]);

    const fileFoundedOnTheRootFolder = LocalFileMother.any();
    const fileFoundedOnTheFirstFolder = LocalFileMother.any();
    const fileFoundedOnTheSecondFolder = LocalFileMother.any();

    repository.returnsFiles(fileFoundedOnTheRootFolder);
    repository.returnsFiles(fileFoundedOnTheFirstFolder);
    repository.returnsFiles(fileFoundedOnTheSecondFolder);

    const result = await SUT.run(folder);

    expect(result).toEqual([
      fileFoundedOnTheRootFolder,
      fileFoundedOnTheFirstFolder,
      fileFoundedOnTheSecondFolder,
    ]);
  });

  it('obtains the files for a deeply nested folder', async () => {
    const NESTED_LEVEL = 100_000;
    const folder = AbsolutePathMother.anyFolder();
    const fileFounded = LocalFileMother.any();

    for (let i = 0; i < NESTED_LEVEL; i++) {
      repository.returnsFolders([AbsolutePathMother.anyFolder()]);
      repository.returnsFiles([]);
    }

    repository.returnsFiles(fileFounded);

    const result = await SUT.run(folder);

    expect(result).toEqual([fileFounded]);
  });
});
