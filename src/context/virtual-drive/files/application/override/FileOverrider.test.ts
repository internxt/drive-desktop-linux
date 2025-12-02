import { FileOverrider } from './override/FileOverrider';
import { FileNotFoundError } from '../domain/errors/FileNotFoundError';
import { FileOverriddenDomainEvent } from '../domain/events/FileOverriddenDomainEvent';
import { BucketEntryIdMother } from '../../../../../../src/context/virtual-drive/shared/domain/__helpers__/BucketEntryIdMother';
import { FileRepositoryMock } from '../../../../../tests/context/virtual-drive/files/__mocks__/FileRepositoryMock';
import { RemoteFileSystemMock } from '../../../../../tests/context/virtual-drive/files/__mocks__/RemoteFileSystemMock';
import { FileMother } from '../domain/__test-helpers__/FileMother';
import { FileSizeMother } from '../domain/__test-helpers__/FileSizeMother';
import { EventBusMock } from 'src/context/virtual-drive/shared/__mocks__/EventBusMock';

describe('File Overrider', () => {
  it('throws an error if no file is founded with the given fileId', async () => {
    const rfs = new RemoteFileSystemMock();
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(rfs, repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(undefined);

    try {
      await overrider.run(file.path, updatedContentsId.value, updatedSize.value);
      expect.fail('it should have thrown an error');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(FileNotFoundError);
    }
  });

  it('calls the override method with the updated contentsId and size updated', async () => {
    const rfs = new RemoteFileSystemMock();
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(rfs, repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);

    await overrider.run(file.path, updatedContentsId.value, updatedSize.value);

    expect(rfs.overrideMock).toBeCalledWith(
      expect.objectContaining({
        _id: file.id,
        _contentsId: updatedContentsId,
        _size: updatedSize,
      }),
    );
  });

  it('emits the FileOverridden domain event when successfully overridden ', async () => {
    const rfs = new RemoteFileSystemMock();
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(rfs, repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.primitive();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);

    await overrider.run(file.path, updatedContentsId, FileSizeMother.primitive());

    expect(eventBus.publishMock).toBeCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: FileOverriddenDomainEvent.EVENT_NAME,
          aggregateId: file.uuid,
        }),
      ]),
    );
  });
});
