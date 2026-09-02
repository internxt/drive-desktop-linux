import { Environment } from '@internxt/inxt-js';
import {
  clearMaxFileSizeRejectionModal,
  isUploadSizeLimitBlockedPath,
} from '../../../../../backend/features/user/file-size-limit/add-max-file-size-rejection';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { CreateFileOnTemporalFileUploaded } from './CreateFileOnTemporalFileUploaded';
import { FileCreatorTestClass } from '../../__test-helpers__/FileCreatorTestClass';
import { FileOverriderTestClass } from '../../__test-helpers__/FileOverriderTestClass';
import { FileMother } from '../../domain/__test-helpers__/FileMother';
import { OfflineContentsUploadedDomainEventMother } from '../../domain/events/__test-helpers__/OfflineContentsUploadedDomainEventMother';
import { call } from 'tests/vitest/utils.helper';
import { preserveRejectedFileSizeTooBig } from '../../../../../backend/features/user/file-size-limit';
import { SyncFileMessenger } from '../../domain/SyncFileMessenger';
import { DeleteTemporalFileIfUnchanged } from '../../../../storage/TemporalFiles/application/deletion/DeleteTemporalFileIfUnchanged';

vi.mock('../../../../../backend/features/user/file-size-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../backend/features/user/file-size-limit')>();

  return {
    ...actual,
    preserveRejectedFileSizeTooBig: vi.fn().mockResolvedValue({
      data: {
        filePath: '/home/user/.config/internxt/rejected-files-size-too-big/rejected/file.pdf',
      },
    }),
  };
});

describe('Create File On Offline File Uploaded', () => {
  const environment = {} as Environment;
  const bucket = 'test-bucket';

  let reaper: { run: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    reaper = { run: vi.fn().mockResolvedValue(undefined) };
  });

  const deleteIfUnchanged = () => reaper as unknown as DeleteTemporalFileIfUnchanged;

  afterEach(() => {
    clearMaxFileSizeRejectionModal();
  });

  it('creates a new file when event replaces field is undefined', async () => {
    const creator = new FileCreatorTestClass();
    const overrider = new FileOverriderTestClass();
    const file = FileMother.noThumbnable();
    creator.mock.mockResolvedValue(file);

    const uploadedEvent = OfflineContentsUploadedDomainEventMother.doesNotReplace();

    const sut = new CreateFileOnTemporalFileUploaded(creator, overrider, environment, bucket, deleteIfUnchanged());

    await sut.on(uploadedEvent);

    call(creator.mock).toMatchObject([uploadedEvent.path, uploadedEvent.aggregateId, uploadedEvent.size]);
  });

  it('does not create a new file when the replaces field is defined', async () => {
    const creator = new FileCreatorTestClass();
    const overrider = new FileOverriderTestClass();
    const file = FileMother.noThumbnable();
    overrider.mock.mockResolvedValue(file);

    const uploadedEvent = OfflineContentsUploadedDomainEventMother.replacesContents();

    const sut = new CreateFileOnTemporalFileUploaded(creator, overrider, environment, bucket, deleteIfUnchanged());

    await sut.on(uploadedEvent);

    expect(creator.mock).not.toHaveBeenCalled();
  });

  it('overrides file with contents specified on the event', async () => {
    const creator = new FileCreatorTestClass();
    const overrider = new FileOverriderTestClass();
    const file = FileMother.noThumbnable();
    overrider.mock.mockResolvedValue(file);

    const uploadedEvent = OfflineContentsUploadedDomainEventMother.replacesContents();

    const sut = new CreateFileOnTemporalFileUploaded(creator, overrider, environment, bucket, deleteIfUnchanged());

    await sut.on(uploadedEvent);

    call(overrider.mock).toMatchObject([uploadedEvent.replaces, uploadedEvent.aggregateId, uploadedEvent.size]);
  });

  it('preserves and queues max file size rejection when backend rejects metadata creation by file size', async () => {
    const creator = new FileCreatorTestClass();
    const overrider = new FileOverriderTestClass();
    creator.mock.mockRejectedValue(new DriveDesktopError('FILE_TOO_BIG'));

    const uploadedEvent = OfflineContentsUploadedDomainEventMother.doesNotReplace();
    Object.assign(uploadedEvent, { contentFilePath: '/tmp/internxt-drive-tmp/staged-file' });

    const sut = new CreateFileOnTemporalFileUploaded(creator, overrider, environment, bucket, deleteIfUnchanged());

    await sut.on(uploadedEvent);

    expect(preserveRejectedFileSizeTooBig).toHaveBeenCalledWith({
      originalPath: uploadedEvent.path,
      temporalContentPath: '/tmp/internxt-drive-tmp/staged-file',
      size: uploadedEvent.size,
    });
    expect(isUploadSizeLimitBlockedPath(uploadedEvent.path)).toBe(false);
  });

  it('publishes an upload issue when an override upload is rejected with a specific cause', async () => {
    const creator = new FileCreatorTestClass();
    const overrider = new FileOverriderTestClass();
    const notifier = { issues: vi.fn().mockResolvedValue(undefined) } as unknown as SyncFileMessenger;
    const uploadedEvent = OfflineContentsUploadedDomainEventMother.replacesContents();

    overrider.mock.mockRejectedValue(new DriveDesktopError('EMPTY_FILE', 'You can not have empty files'));

    const sut = new CreateFileOnTemporalFileUploaded(creator, overrider, environment, bucket, deleteIfUnchanged(), notifier);

    await sut.on(uploadedEvent);

    expect(notifier.issues).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'UPLOAD_ERROR',
        cause: 'EMPTY_FILE',
      }),
    );
  });
  it('reaps the staged copy after an override, so a later release has nothing to upload', async () => {
    const creator = new FileCreatorTestClass();
    const overrider = new FileOverriderTestClass();
    overrider.mock.mockResolvedValue(FileMother.noThumbnable());

    const uploadedEvent = OfflineContentsUploadedDomainEventMother.replacesContents();

    const sut = new CreateFileOnTemporalFileUploaded(creator, overrider, environment, bucket, deleteIfUnchanged());

    await sut.on(uploadedEvent);

    expect(reaper.run).toHaveBeenCalledWith(uploadedEvent.path, uploadedEvent.occurredOn);
  });

  it('leaves the staged copy of a newly created file to the created-event subscriber', async () => {
    const creator = new FileCreatorTestClass();
    const overrider = new FileOverriderTestClass();
    creator.mock.mockResolvedValue(FileMother.noThumbnable());

    const uploadedEvent = OfflineContentsUploadedDomainEventMother.doesNotReplace();

    const sut = new CreateFileOnTemporalFileUploaded(creator, overrider, environment, bucket, deleteIfUnchanged());

    await sut.on(uploadedEvent);

    expect(reaper.run).not.toHaveBeenCalled();
  });

  it('keeps the staged copy when the override fails, so the next release retries', async () => {
    const creator = new FileCreatorTestClass();
    const overrider = new FileOverriderTestClass();
    overrider.mock.mockRejectedValue(new DriveDesktopError('INTERNAL_SERVER_ERROR'));

    const uploadedEvent = OfflineContentsUploadedDomainEventMother.replacesContents();

    const sut = new CreateFileOnTemporalFileUploaded(creator, overrider, environment, bucket, deleteIfUnchanged());

    await sut.on(uploadedEvent);

    expect(reaper.run).not.toHaveBeenCalled();
  });
});
