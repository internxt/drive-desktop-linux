import { FolderCreatorFromOfflineFolder } from '../../../../../src/context/virtual-drive/folders/application/create/FolderCreatorFromOfflineFolder';
import { EventBusMock } from '../../shared/__mock__/EventBusMock';
import { FolderRemoteFileSystemMock } from '../__mocks__/FolderRemoteFileSystemMock';
import { FolderRepositoryMock } from '../__mocks__/FolderRepositoryMock';
import { SyncFolderMessengerMock } from '../__mocks__/SyncFolderMessengerMock';
import { FolderMother } from '../domain/FolderMother';
import { OfflineFolderMother } from '../domain/OfflineFolderMother';
import { ParentFolderFinder } from '../../../../../src/context/virtual-drive/folders/application/ParentFolderFinder';

const WITH_UUID = true;

describe('Folder Creator from Offline Folder', () => {
  let SUT: FolderCreatorFromOfflineFolder;

  let repository: FolderRepositoryMock;
  let remote: FolderRemoteFileSystemMock;
  let eventBus: EventBusMock;
  let messenger: SyncFolderMessengerMock;
  let parentFinder: ParentFolderFinder;

  beforeEach(() => {
    repository = new FolderRepositoryMock();
    remote = new FolderRemoteFileSystemMock();
    messenger = new SyncFolderMessengerMock();
    eventBus = new EventBusMock();
    parentFinder = {
      run: jest.fn(),
    } as unknown as ParentFolderFinder;

    SUT = new FolderCreatorFromOfflineFolder(
      repository,
      remote,
      eventBus,
      messenger,
      parentFinder
    );
  });

  it('creates on a folder from a offline folder', async () => {
    const offlineFolder = OfflineFolderMother.random();
    const folder = FolderMother.fromPartial(offlineFolder.attributes());

    remote.shouldPersists(folder, WITH_UUID);

    repository.addMock.mockResolvedValueOnce(Promise.resolve());

    const parentFolder = FolderMother.any();
    (parentFinder.run as jest.Mock).mockResolvedValueOnce(parentFolder);

    await SUT.run(offlineFolder);

    expect(remote.persistMock).toHaveBeenCalledWith(
      offlineFolder.name,
      expect.objectContaining({ value: offlineFolder.parentId }),
      parentFolder.uuid
    );

    expect(repository.addMock).toBeCalledWith(folder);
  });

  describe('Synchronization messages', () => {
    it('sends the message FOLDER_CREATING', async () => {
      const offlineFolder = OfflineFolderMother.random();
      const expectedFolder = FolderMother.fromPartial(offlineFolder.attributes());

      const parentFolder = FolderMother.any();
      (parentFinder.run as jest.Mock).mockResolvedValueOnce(parentFolder);

      remote.shouldPersists(expectedFolder, WITH_UUID);
      repository.addMock.mockImplementationOnce(() => {});

      await SUT.run(offlineFolder);

      expect(messenger.creatingMock).toBeCalledWith(offlineFolder.name);
    });

    it('sends the message FOLDER_CREATED', async () => {
      const offlineFolder = OfflineFolderMother.random();
      const expectedFolder = FolderMother.fromPartial(offlineFolder.attributes());

      const parentFolder = FolderMother.any();
      (parentFinder.run as jest.Mock).mockResolvedValueOnce(parentFolder);

      remote.shouldPersists(expectedFolder, WITH_UUID);
      repository.addMock.mockImplementationOnce(() => {});

      await SUT.run(offlineFolder);

      expect(messenger.createdMock).toBeCalledWith(offlineFolder.name);
    });
  });
});
