import { FilePathUpdater } from '../../../../../src/context/virtual-drive/files/application/move/FilePathUpdater';
import { FilePath } from '../../../../../src/context/virtual-drive/files/domain/FilePath';
import { ParentFolderFinder } from '../../../../../src/context/virtual-drive/folders/application/ParentFolderFinder';
import { ParentFolderFinderTestClass } from '../../folders/__test-class__/ParentFolderFinderTestClass';
import { FolderMother } from '../../folders/domain/FolderMother';
import { EventBusMock } from '../../shared/__mock__/EventBusMock';
import { FileRepositoryMock } from '../__mocks__/FileRepositoryMock';
import { SingleFileMatchingTestClass } from '../__test-class__/SingleFileMatchingTestClass';
import { FileMother } from '../domain/FileMother';
import { driveServerModule } from '../../../../../src/infra/drive-server/drive-server.module';
import { FileRepository } from '../../../../../src/context/virtual-drive/files/domain/FileRepository';

jest.mock('../../../../../src/infra/drive-server/drive-server.module', () => ({
  driveServerModule: {
    files: {
      renameFile: jest.fn(),
      moveFile: jest.fn(),
    },
  },
}));

describe('File path updater', () => {
  let repository: FileRepositoryMock;
  let folderFinder: ParentFolderFinderTestClass;
  let singleFileMatchingTestClass: SingleFileMatchingTestClass;
  let eventBus: EventBusMock;
  let SUT: FilePathUpdater;

  beforeEach(() => {
    repository = new FileRepositoryMock();
    folderFinder = new ParentFolderFinderTestClass();
    singleFileMatchingTestClass = new SingleFileMatchingTestClass();
    eventBus = new EventBusMock();

    SUT = new FilePathUpdater(
      repository as unknown as FileRepository,
      singleFileMatchingTestClass,
      folderFinder as unknown as ParentFolderFinder,
      eventBus
    );
  });

  it('renames a file when the extension and folder does not change', async () => {
    const fileToRename = FileMother.any();

    singleFileMatchingTestClass.mock.mockReturnValueOnce(fileToRename);
    repository.matchingPartialMock.mockReturnValueOnce([]);

    const destination = new FilePath(
      `${fileToRename.dirname}/_${fileToRename.nameWithExtension}`
    );

    await SUT.run(fileToRename.contentsId, destination.value);

    expect(repository.updateMock).toBeCalledWith(
      expect.objectContaining({ path: destination.value })
    );

    expect(driveServerModule.files.renameFile).toBeCalledWith(
      expect.objectContaining({
        plainName: fileToRename.name,
        type: fileToRename.type,
        uuid: fileToRename.uuid,
      })
    );
  });

  it('does not rename or moves a file when the extension changes', async () => {
    const fileToRename = FileMother.any();
    const fileWithDestinationPath = undefined;

    singleFileMatchingTestClass.mock
      .mockReturnValueOnce(fileToRename)
      .mockReturnValueOnce(fileWithDestinationPath);

    const destination = new FilePath(
      `${fileToRename.dirname}/_${fileToRename.nameWithExtension}n`
    );

    expect(async () => {
      await SUT.run(fileToRename.contentsId, destination.value);
    }).rejects.toThrow();
  });

  it('moves a file when the folder changes', async () => {
    const fileToMove = FileMother.any();
    const fileInDestination = undefined;

    singleFileMatchingTestClass.mock
      .mockReturnValueOnce(fileToMove)
      .mockReturnValueOnce(fileInDestination);

    const destination = new FilePath(
      `${fileToMove.dirname}_/${fileToMove.nameWithExtension}`
    );

    const destinationFolder = FolderMother.fromPartial({
      id: fileToMove.folderId + 1,
      path: destination.dirname(),
    });

    folderFinder.mock.mockReturnValueOnce(destinationFolder);

    await SUT.run(fileToMove.contentsId, destination.value);

    expect(repository.updateMock).toBeCalledWith(
      expect.objectContaining({
        folderId: destinationFolder.id,
        path: destination.value,
      })
    );
    expect(driveServerModule.files.moveFile).toBeCalledWith(
      expect.objectContaining({
        parentUuid: destinationFolder.uuid,
        uuid: fileToMove.uuid,
      })
    );
  });
});
