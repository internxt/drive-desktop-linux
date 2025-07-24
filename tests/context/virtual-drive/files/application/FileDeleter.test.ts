import { FileRepositoryMock } from '../__mocks__/FileRepositoryMock';
import { FileMother } from '../domain/FileMother';
import { FileTrasher } from '../../../../../src/context/virtual-drive/files/application/trash/FileTrasher';
import { FolderRepositoryMock } from '../../folders/__mocks__/FolderRepositoryMock';
import { AllParentFoldersStatusIsExists } from '../../../../../src/context/virtual-drive/folders/application/AllParentFoldersStatusIsExists';
import { FileSyncNotifierMock } from '../__mocks__/FileSyncNotifierMock';
import { FileStatus } from '../../../../../src/context/virtual-drive/files/domain/FileStatus';
import { BucketEntryIdMother } from '../../shared/domain/BucketEntryIdMother';
import { driveServerModule } from '../../../../../src/infra/drive-server/drive-server.module';

jest.mock('../../../../../src/infra/drive-server/drive-server.module', () => ({
  driveServerModule: {
    files: {
      addFileToTrash: jest.fn(),
    },
  },
}));

describe('File Deleter', () => {
  let repository: FileRepositoryMock;
  let allParentFoldersStatusIsExists: AllParentFoldersStatusIsExists;
  let notifier: FileSyncNotifierMock;

  let SUT: FileTrasher;

  beforeEach(() => {
    repository = new FileRepositoryMock();
    const folderRepository = new FolderRepositoryMock();
    allParentFoldersStatusIsExists = new AllParentFoldersStatusIsExists(
      folderRepository
    );
    notifier = new FileSyncNotifierMock();

    SUT = new FileTrasher(repository, allParentFoldersStatusIsExists, notifier);
  });

  it('does not nothing if the file its not found', async () => {
    const contentsId = BucketEntryIdMother.primitive();

    repository.matchingPartialMock.mockReturnValueOnce([]);
    jest
      .spyOn(allParentFoldersStatusIsExists, 'run')
      .mockResolvedValueOnce(false);

    await SUT.run(contentsId);

    expect(repository.deleteMock).not.toBeCalled();
  });

  it('does not delete a file if it has a parent already trashed', async () => {
    const file = FileMother.any();

    repository.matchingPartialMock.mockReturnValueOnce([file]);
    jest
      .spyOn(allParentFoldersStatusIsExists, 'run')
      .mockResolvedValueOnce(false);

    await SUT.run(file.contentsId);

    expect(repository.deleteMock).not.toBeCalled();
  });

  it('trashes the file if it exists and does not have any parent trashed', async () => {
    const file = FileMother.any();

    repository.matchingPartialMock.mockReturnValueOnce([file]);
    jest
      .spyOn(allParentFoldersStatusIsExists, 'run')
      .mockResolvedValueOnce(true);

    await SUT.run(file.contentsId);

    expect(driveServerModule.files.addFileToTrash).toBeCalled();
  });

  it('trashes the file with the status trashed', async () => {
    const file = FileMother.any();

    repository.matchingPartialMock.mockReturnValueOnce([file]);
    jest
      .spyOn(allParentFoldersStatusIsExists, 'run')
      .mockResolvedValueOnce(true);

    await SUT.run(file.contentsId);

    expect(driveServerModule.files.addFileToTrash).toBeCalledWith({
      id: file.contentsId,
      uuid: file.uuid,
      type: 'file',
    });
    expect(repository.updateMock).toBeCalledWith(
      expect.objectContaining({ status: FileStatus.Trashed })
    );
  });
});
