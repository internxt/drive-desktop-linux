import { AllFilesInFolderAreAvailableOffline } from '../../../../../../src/context/storage/StorageFiles/application/offline/AllFilesInFolderAreAvailableOffline';
import { StorageFileId } from '../../../../../../src/context/storage/StorageFiles/domain/StorageFileId';
import { FilesByPartialSearcherTestClass } from '../../../../virtual-drive/files/__test-class__/search/FilesByPartialSearcherTestClass';
import { FileMother } from '../../../../virtual-drive/files/domain/FileMother';
import { SingleFolderMatchingFinderTestClass } from '../../../../virtual-drive/folders/__test-class__/SingleFolderMatchingFinderTestClass';
import { FolderMother } from '../../../../virtual-drive/folders/domain/FolderMother';
import { FolderPathMother } from '../../../../virtual-drive/folders/domain/FolderPathMother';
import { StorageFilesRepositoryMock } from '../../__mocks__/StorageFilesRepositoryMock';

describe('All Files In Folder Are Available Offline', () => {
  let SUT: AllFilesInFolderAreAvailableOffline;

  let singleFolderFinder: SingleFolderMatchingFinderTestClass;
  let filesByPartialSearcher: FilesByPartialSearcherTestClass;
  let repository: StorageFilesRepositoryMock;

  beforeAll(() => {
    singleFolderFinder = new SingleFolderMatchingFinderTestClass();
    filesByPartialSearcher = new FilesByPartialSearcherTestClass();
    repository = new StorageFilesRepositoryMock();

    SUT = new AllFilesInFolderAreAvailableOffline(
      singleFolderFinder,
      filesByPartialSearcher,
      repository
    );
  });

  beforeAll(() => {
    jest.resetAllMocks();
  });

  it('returns false if the folder is empty', async () => {
    singleFolderFinder.finds(FolderMother.any());
    filesByPartialSearcher.finds([]);

    const result = await SUT.run(FolderPathMother.asPrimitive());

    expect(result).toBe(false);
  });

  it('returns false if the file is not avaliable offline', async () => {
    const fileFound = FileMother.any();
    singleFolderFinder.finds(FolderMother.any());
    filesByPartialSearcher.finds([fileFound]);

    const id = new StorageFileId(fileFound.contentsId);

    repository.shouldExists([{ id, value: false }]);

    const result = await SUT.run(FolderPathMother.asPrimitive());

    expect(result).toBe(false);
  });

  it('returns false if any file is not avaliable offline', async () => {
    const filesFound = [FileMother.any(), FileMother.any(), FileMother.any()];
    const ids = filesFound.map((file) => new StorageFileId(file.contentsId));

    const lastDoesNotExits = ids.map((id, i, arr) => {
      if (i == arr.length - 1) return { id, value: false };

      return { id, value: true };
    });

    singleFolderFinder.finds(FolderMother.any());
    filesByPartialSearcher.finds(filesFound);

    repository.shouldExists(lastDoesNotExits);

    const result = await SUT.run(FolderPathMother.asPrimitive());

    expect(result).toBe(false);
  });

  it('returns true if all files are avaliable offline', async () => {
    const filesFound = [FileMother.any(), FileMother.any(), FileMother.any()];
    const ids = filesFound.map((file) => new StorageFileId(file.contentsId));
    const allExists = ids.map((id) => ({ id, value: true }));

    singleFolderFinder.finds(FolderMother.any());

    filesByPartialSearcher.finds(filesFound);

    repository.shouldExists(allExists);

    const result = await SUT.run(FolderPathMother.asPrimitive());

    expect(result).toBe(true);
  });
});
