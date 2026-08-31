import { BucketEntryIdMother } from '../../../../../context/virtual-drive/shared/domain/__test-helpers__/BucketEntryIdMother';
import { EventBusMock } from '../../../../../context/virtual-drive/shared/__mocks__/EventBusMock';
import { FileRepositoryMock } from '../../__mocks__/FileRepositoryMock';
import { FileOverrider, MAX_TRANSIENT_OVERRIDE_RETRIES } from './FileOverrider';
import { FileMother } from '../../domain/__test-helpers__/FileMother';
import { FileSizeMother } from '../../domain/__test-helpers__/FileSizeMother';
import { FileNotFoundError } from '../../domain/errors/FileNotFoundError';
import { FileOverriddenDomainEvent } from '../../domain/events/FileOverriddenDomainEvent';
import * as overrideFileModule from '../../../../../infra/drive-server/services/files/services/override-file';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { DriveServerError } from '../../../../../infra/drive-server/drive-server.error';
import { call, partialSpyOn } from '../../../../../../tests/vitest/utils.helper';

describe('File Overrider', () => {
  const overrideFileMock = partialSpyOn(overrideFileModule, 'overrideFile');

  beforeEach(() => {
    vi.useFakeTimers();
    overrideFileMock.mockResolvedValue({ data: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws an error if no file is founded with the given fileId', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

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
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);

    await overrider.run(file.path, updatedContentsId.value, updatedSize.value);

    call(overrideFileMock).toStrictEqual({
      fileUuid: file.uuid,
      fileContentsId: updatedContentsId.value,
      fileSize: updatedSize.value,
    });
  });

  it('throws FILE_TOO_BIG when backend rejects the override size', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    overrideFileMock.mockResolvedValueOnce({ error: new DriveServerError('FILE_TOO_BIG', 402) });

    await expect(overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value)).rejects.toMatchObject({
      cause: 'FILE_TOO_BIG',
    } satisfies Partial<DriveDesktopError>);

    expect(repository.updateMock).not.toHaveBeenCalled();
    expect(eventBus.publishMock).not.toHaveBeenCalled();
  });

  it('throws EMPTY_FILE when backend rejects empty files during override', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    overrideFileMock.mockResolvedValueOnce({
      error: new DriveServerError('EMPTY_FILE', 402, 'You can not have empty files'),
    });

    await expect(overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value)).rejects.toMatchObject({
      cause: 'EMPTY_FILE',
      message: 'You can not have empty files',
    } satisfies Partial<DriveDesktopError>);

    expect(repository.updateMock).not.toHaveBeenCalled();
    expect(eventBus.publishMock).not.toHaveBeenCalled();
  });

  it('throws RATE_LIMITED when backend returns TOO_MANY_REQUESTS, without retrying it', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    overrideFileMock.mockResolvedValue({
      error: new DriveServerError('TOO_MANY_REQUESTS', 429, JSON.stringify({ retry_after: 7 })),
    });

    const promise = overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value);
    const assertion = expect(promise).rejects.toMatchObject({
      cause: 'RATE_LIMITED',
      message: '7000',
    } satisfies Partial<DriveDesktopError>);
    await vi.runAllTimersAsync();

    await assertion;

    // A rate limit is deliberately NOT retried here: its backoff starts at 30s,
    // and a write that sleeps that long can wake after a newer save.
    expect(overrideFileMock).toHaveBeenCalledTimes(1);
    expect(repository.updateMock).not.toHaveBeenCalled();
    expect(eventBus.publishMock).not.toHaveBeenCalled();
  });

  it('throws INTERNAL_SERVER_ERROR once the retries are exhausted and the backend keeps returning SERVER_ERROR', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    overrideFileMock.mockResolvedValue({
      error: new DriveServerError('SERVER_ERROR', 500, 'server exploded'),
    });

    const promise = overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value);
    // Attach the rejection handler BEFORE draining the timers: between
    // creation and assertion the promise would otherwise reject unheard.
    const assertion = expect(promise).rejects.toMatchObject({
      cause: 'INTERNAL_SERVER_ERROR',
      message: 'server exploded',
    } satisfies Partial<DriveDesktopError>);
    await vi.runAllTimersAsync();

    await assertion;

    expect(repository.updateMock).not.toHaveBeenCalled();
    expect(eventBus.publishMock).not.toHaveBeenCalled();
  });

  it('throws UNKNOWN when backend returns an unmapped error cause', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    overrideFileMock.mockResolvedValueOnce({
      error: new DriveServerError('BAD_REQUEST', 400, 'bad request'),
    });

    await expect(overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value)).rejects.toMatchObject({
      cause: 'UNKNOWN',
      message: 'bad request',
    } satisfies Partial<DriveDesktopError>);

    expect(repository.updateMock).not.toHaveBeenCalled();
    expect(eventBus.publishMock).not.toHaveBeenCalled();
  });

  it('emits the FileOverridden domain event when successfully overridden ', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

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

  it('retries a transient server error and completes the override when it clears', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    // One 502, then the server recovers. This is the production failure: the
    // content is already uploaded and only the metadata write failed.
    overrideFileMock.mockResolvedValueOnce({ error: new DriveServerError('SERVER_ERROR', 502, 'bad gateway') });

    const promise = overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe(file);
    expect(overrideFileMock).toHaveBeenCalledTimes(2);
    expect(repository.updateMock).toHaveBeenCalled();
    expect(eventBus.publishMock).toHaveBeenCalled();
  });

  it('stops after the attempt ceiling instead of retrying a failing server forever', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    overrideFileMock.mockResolvedValue({ error: new DriveServerError('SERVER_ERROR', 502, 'bad gateway') });

    const promise = overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value);
    // Attach the rejection handler BEFORE draining the timers: between
    // creation and assertion the promise would otherwise reject unheard.
    const assertion = expect(promise).rejects.toMatchObject({
      cause: 'INTERNAL_SERVER_ERROR',
    } satisfies Partial<DriveDesktopError>);
    await vi.runAllTimersAsync();

    await assertion;
    // The first call plus one per permitted retry, and no more.
    expect(overrideFileMock).toHaveBeenCalledTimes(MAX_TRANSIENT_OVERRIDE_RETRIES + 1);
  });

  it('does not retry an error that is not transient', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    overrideFileMock.mockResolvedValue({ error: new DriveServerError('FILE_TOO_BIG', 402) });

    const promise = overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value);
    // Attach the rejection handler BEFORE draining the timers: between
    // creation and assertion the promise would otherwise reject unheard.
    const assertion = expect(promise).rejects.toMatchObject({
      cause: 'FILE_TOO_BIG',
    } satisfies Partial<DriveDesktopError>);
    await vi.runAllTimersAsync();

    await assertion;
    expect(overrideFileMock).toHaveBeenCalledTimes(1);
  });

  it('lets a non-transient error escape immediately even after a transient one', async () => {
    const repository = new FileRepositoryMock();
    const eventBus = new EventBusMock();

    const overrider = new FileOverrider(repository, eventBus);

    const file = FileMother.any();
    const updatedContentsId = BucketEntryIdMother.random();
    const updatedSize = FileSizeMother.random();

    repository.searchByContentsIdMock.mockReturnValueOnce(file);
    overrideFileMock
      .mockResolvedValueOnce({ error: new DriveServerError('SERVER_ERROR', 502, 'bad gateway') })
      .mockResolvedValue({ error: new DriveServerError('FILE_TOO_BIG', 402) });

    const promise = overrider.run(file.contentsId, updatedContentsId.value, updatedSize.value);
    const assertion = expect(promise).rejects.toMatchObject({
      cause: 'FILE_TOO_BIG',
    } satisfies Partial<DriveDesktopError>);
    await vi.runAllTimersAsync();

    await assertion;

    // One retry was spent on the 502; the FILE_TOO_BIG that followed stops the
    // loop at once rather than consuming the rest of the budget.
    expect(overrideFileMock).toHaveBeenCalledTimes(2);
    expect(repository.updateMock).not.toHaveBeenCalled();
  });
});
