import { BucketEntryIdMother } from '../../../../../context/virtual-drive/shared/domain/__test-helpers__/BucketEntryIdMother';
import { FileCreator } from './FileCreator';
import { FileContentsId } from '../../domain/FileContentsId';
import { FilePath } from '../../domain/FilePath';
import { FolderFinderFactory } from '../../../folders/__mocks__/FolderFinderFactory';
import { FileRepositoryMock } from '../../__mocks__/FileRepositoryMock';
import { FileSyncNotifierMock } from '../../__mocks__/FileSyncNotifierMock';
import { RemoteFileSystemMock } from '../../__mocks__/RemoteFileSystemMock';
import { FileMother } from '../../domain/__test-helpers__/FileMother';
import { FileSizeMother } from '../../domain/__test-helpers__/FileSizeMother';
import { left, right } from '../../../../shared/domain/Either';
import { EventBusMock } from '../../../../../context/virtual-drive/shared/__mocks__/EventBusMock';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { calls } from '../../../../../../tests/vitest/utils.helper';
import { PendingModificationTimes } from '../utimens/PendingModificationTimes';

describe('File Creator', () => {
  let remoteFileSystemMock: RemoteFileSystemMock;
  let fileRepository: FileRepositoryMock;
  let eventBus: EventBusMock;
  let notifier: FileSyncNotifierMock;
  let pendingModificationTimes: PendingModificationTimes;

  let SUT: FileCreator;

  beforeEach(() => {
    remoteFileSystemMock = new RemoteFileSystemMock();
    fileRepository = new FileRepositoryMock();
    const parentFolderFinder = FolderFinderFactory.existingFolder();
    eventBus = new EventBusMock();
    notifier = new FileSyncNotifierMock();
    pendingModificationTimes = new PendingModificationTimes();

    SUT = new FileCreator(
      remoteFileSystemMock,
      fileRepository,
      parentFolderFinder,
      eventBus,
      notifier,
      pendingModificationTimes,
    );
  });

  it('creates the file on the drive server', async () => {
    const path = new FilePath('/cat.png');
    const contentsId = BucketEntryIdMother.random();
    const size = FileSizeMother.random();

    const fileAttributes = FileMother.fromPartial({
      path: path.value,
      contentsId: contentsId.value,
    }).attributes();

    fileRepository.addMock.mockImplementationOnce(() => Promise.resolve());

    remoteFileSystemMock.persistMock.mockResolvedValueOnce(right(fileAttributes));

    await SUT.run(path.value, contentsId.value, size.value);

    expect(fileRepository.addMock).toBeCalledWith(
      expect.objectContaining({
        _contentsId: new FileContentsId(fileAttributes.contentsId),
      }),
    );
  });

  it('once the file entry is created the creation event should have been emitted', async () => {
    const path = new FilePath('/cat.png');
    const contentsId = BucketEntryIdMother.random();
    const size = FileSizeMother.random();
    const fileAttributes = FileMother.fromPartial({
      path: path.value,
      contentsId: contentsId.value,
    }).attributes();

    fileRepository.addMock.mockImplementationOnce(() => Promise.resolve());

    remoteFileSystemMock.persistMock.mockResolvedValueOnce(right(fileAttributes));

    await SUT.run(path.value, contentsId.value, size.value);

    expect(eventBus.publishMock.mock.calls[0][0][0].eventName).toBe('file.created');
    expect(eventBus.publishMock.mock.calls[0][0][0].aggregateId).toBe(fileAttributes.uuid);
  });

  it('retries on RATE_LIMITED and only runs side effects once', async () => {
    const path = new FilePath('/dog.png');
    const contentsId = BucketEntryIdMother.random();
    const size = FileSizeMother.random();
    const fileAttributes = FileMother.fromPartial({
      path: path.value,
      contentsId: contentsId.value,
    }).attributes();

    fileRepository.addMock.mockImplementationOnce(() => Promise.resolve(true));
    remoteFileSystemMock.persistMock
      .mockResolvedValueOnce(left(new DriveDesktopError('RATE_LIMITED', '1')))
      .mockResolvedValueOnce(right(fileAttributes));

    await SUT.run(path.value, contentsId.value, size.value);

    calls(remoteFileSystemMock.persistMock).toHaveLength(2);
    calls(fileRepository.addMock).toHaveLength(1);
    calls(eventBus.publishMock).toHaveLength(1);
    calls(notifier.createdMock).toHaveLength(1);
  });

  it('does not retry on non-retryable errors', async () => {
    const path = new FilePath('/bird.png');
    const contentsId = BucketEntryIdMother.random();
    const size = FileSizeMother.random();

    remoteFileSystemMock.persistMock.mockResolvedValueOnce(left(new DriveDesktopError('UNKNOWN')));

    await expect(SUT.run(path.value, contentsId.value, size.value)).rejects.toThrow();

    calls(remoteFileSystemMock.persistMock).toHaveLength(1);
    calls(fileRepository.addMock).toHaveLength(0);
    calls(eventBus.publishMock).toHaveLength(0);
    calls(notifier.createdMock).toHaveLength(0);
    calls(notifier.issuesMock).toHaveLength(1);
  });

  it('puts a requested modification time back when the create failed', async () => {
    // The staged copy survives a failed upload and the next release will create
    // the file. It should still carry the time the user asked for, not the
    // moment the retry happened to succeed.
    const path = new FilePath('/bird.png');
    const contentsId = BucketEntryIdMother.random();
    const size = FileSizeMother.random();
    const requested = new Date('2024-03-04T05:06:07.000Z');

    pendingModificationTimes.set(path.value, requested);
    remoteFileSystemMock.persistMock.mockResolvedValueOnce(left(new DriveDesktopError('UNKNOWN')));

    await expect(SUT.run(path.value, contentsId.value, size.value)).rejects.toThrow();

    expect(pendingModificationTimes.take(path.value)).toEqual(requested);
  });

  it('spends a requested modification time exactly once on a create that lands', async () => {
    const path = new FilePath('/cat.png');
    const contentsId = BucketEntryIdMother.random();
    const size = FileSizeMother.random();
    const requested = new Date('2024-03-04T05:06:07.000Z');

    pendingModificationTimes.set(path.value, requested);
    remoteFileSystemMock.persistMock.mockResolvedValueOnce(right(FileMother.fromPartial({ path: path.value })));

    await SUT.run(path.value, contentsId.value, size.value);

    expect(remoteFileSystemMock.persistMock).toHaveBeenCalledWith(
      expect.objectContaining({ modificationTime: requested }),
    );
    expect(pendingModificationTimes.take(path.value)).toBeUndefined();
  });
});
