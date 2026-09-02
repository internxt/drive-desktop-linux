import { Readable } from 'node:stream';
import { mockDeep } from 'vitest-mock-extended';
import { partialSpyOn } from '../../../../../../tests/vitest/utils.helper';
import configStore from '../../../../../apps/main/config';
import {
  clearMaxFileSizeRejectionModal,
  clearUploadSizeLimitBlockedPath,
  isUploadSizeLimitBlockedPath,
} from '../../../../../backend/features/user/file-size-limit/add-max-file-size-rejection';
import * as validateSpaceModule from '../../../../../backend/features/usage/validate-space';
import { EventBus } from '../../../../virtual-drive/shared/domain/EventBus';
import { TemporalFile } from '../../domain/TemporalFile';
import { Optional } from '../../../../../shared/types/Optional';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { TemporalFileUploaderFactory } from '../../domain/upload/TemporalFileUploaderFactory';
import { TemporalFileUploader } from './TemporalFileUploader';
import { call, calls } from '../../../../../../tests/vitest/utils.helper';

describe('TemporalFileUploader', () => {
  const configGetMock = partialSpyOn(configStore, 'get');
  const validateSpaceMock = partialSpyOn(validateSpaceModule, 'validateSpace');
  const repository = mockDeep<TemporalFileRepository>();
  const uploaderFactory = mockDeep<TemporalFileUploaderFactory>();
  const eventBus = mockDeep<EventBus>();

  const temporalFile = TemporalFile.from({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    path: '/file.txt',
    size: 101,
  });

  const emptyTemporalFile = TemporalFile.from({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    path: '/new-zero-file.png',
    size: 0,
  });

  const stopWatching = vi.fn();
  const open = vi.fn();
  const dispose = vi.fn();

  /** Stands in for the immutable per-upload copy the repository hands out. */
  function snapshotOf(content: string) {
    open.mockImplementation(() => Readable.from([content]));
    dispose.mockResolvedValue(undefined);
    return { size: Buffer.byteLength(content), open, dispose };
  }

  beforeEach(() => {
    repository.watchFile.mockReturnValue(stopWatching);
    eventBus.publish.mockResolvedValue(undefined);
    uploaderFactory.read.mockReturnValue(uploaderFactory);
    uploaderFactory.document.mockReturnValue(uploaderFactory);
    uploaderFactory.replaces.mockReturnValue(uploaderFactory);
    uploaderFactory.abort.mockReturnValue(uploaderFactory);
    uploaderFactory.build.mockReturnValue(async () => 'contents-id');
    repository.createUploadSnapshot.mockResolvedValue(snapshotOf('content'));
    // mockDeep returns undefined from find(), and clearMocks does not reset
    // implementations, so without this every test after the first one to set it
    // would silently inherit that one's stub. Set it for all of them.
    repository.find.mockResolvedValue(
      Optional.of(
        TemporalFile.from({
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
          path: '/file.txt',
          size: 101,
          revision: 42,
        }),
      ),
    );
    validateSpaceMock.mockResolvedValue({ data: { hasSpace: true } });
  });

  afterEach(() => {
    clearMaxFileSizeRejectionModal();
    clearUploadSizeLimitBlockedPath('/file.txt');
  });

  it('does not fail the upload when the staged revision cannot be read', async () => {
    // release() deletes the staged copy whenever an upload fails, so a fault in
    // this bookkeeping must not be allowed to look like an upload failure.
    repository.find.mockRejectedValue(new Error('EIO reading the staging directory'));

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await expect(
      sut.run(temporalFile, { contentsId: 'old-contents-id', name: 'file', extension: 'txt' }),
    ).resolves.toBe('contents-id');

    call(eventBus.publish).toMatchObject([{ uploadedRevision: undefined }]);
  });

  it('records the length the upload sent, not the one the caller was holding', async () => {
    // The window is real: run() awaits validateSpace, a network round trip,
    // before anything is opened, and the file can grow in it. The declared
    // length and the recorded size both have to come from the descriptor the
    // upload actually reads, or the reaper is asked to trust a pairing between
    // a length and a revision that never described the same file at once.
    repository.createUploadSnapshot.mockResolvedValue(snapshotOf('a'.repeat(500)));
    repository.find.mockResolvedValue(
      Optional.of(
        TemporalFile.from({
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
          path: '/file.txt',
          size: 500, // grew since the caller looked
          revision: 43,
        }),
      ),
    );

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await sut.run(temporalFile, { contentsId: 'old-contents-id', name: 'file', extension: 'txt' });

    // 101 is what temporalFile still says; 500 is what the snapshot will send.
    expect(uploaderFactory.build).toHaveBeenCalledWith(500);
    call(eventBus.publish).toMatchObject([{ size: 500, uploadedRevision: 43 }]);
  });

  it('records the revision as of the moment the snapshot was taken, not after', async () => {
    // Moving the read below the snapshot is the mistake the comment in the
    // source warns about; this makes that ordering observable. Reading late
    // would publish 99 for bytes the snapshot bounded before that write, and
    // the reaper would then delete a staged copy holding data the cloud does
    // not have. Reading early publishes 41, the reaper sees a difference, and
    // the staged copy survives to be uploaded again.
    let current = 41;
    const staged = (revision: number) =>
      Optional.of(
        TemporalFile.from({
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
          path: '/file.txt',
          size: 101,
          revision,
        }),
      );
    repository.find.mockImplementation(async () => staged(current));
    repository.createUploadSnapshot.mockImplementation(async () => {
      current = 99; // a write lands as the descriptor is taken
      return snapshotOf('content');
    });

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await sut.run(temporalFile, { contentsId: 'old-contents-id', name: 'file', extension: 'txt' });

    call(eventBus.publish).toMatchObject([{ uploadedRevision: 41 }]);
  });

  it('publishes a revision for an empty staged copy too, so it can be reaped', async () => {
    repository.find.mockResolvedValue(
      Optional.of(
        TemporalFile.from({
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
          path: '/new-zero-file.png',
          size: 0,
          revision: 12,
        }),
      ),
    );

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await sut.run(emptyTemporalFile, { contentsId: 'old-contents-id', name: 'f', extension: 'png' });

    call(eventBus.publish).toMatchObject([{ uploadedRevision: 12 }]);
  });

  it('publishes the revision of the staged copy it uploaded, read before the snapshot', async () => {
    // Whatever reaps the staged copy has to know which revision reached the
    // cloud. It must be the revision read just before the snapshot bounded the
    // bytes, not one the caller found before the awaited space check, or a
    // write in that window is sent while the event still describes the older
    // bytes.
    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await sut.run(temporalFile, { contentsId: 'old-contents-id', name: 'file', extension: 'txt' });

    call(eventBus.publish).toMatchObject([
      {
        path: temporalFile.path.value,
        uploadedRevision: 42,
      },
    ]);
  });

  it('retries content upload on RATE_LIMITED and succeeds', async () => {
    // Given
    uploaderFactory.build
      .mockReturnValueOnce(() => Promise.reject({ status: 429, message: JSON.stringify({ retry_after: 0.001 }) }))
      .mockReturnValueOnce(() => Promise.resolve('contents-id'));

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    // When
    const result = await sut.run(temporalFile);

    // Then
    expect(result).toBe('contents-id');
    calls(repository.createUploadSnapshot).toHaveLength(1);
    calls(open).toHaveLength(2);
    calls(uploaderFactory.build).toHaveLength(2);
    calls(eventBus.publish).toHaveLength(1);
    calls(stopWatching).toHaveLength(1);
    calls(dispose).toHaveLength(1);
  });

  it('stops retrying on non-retryable upload errors', async () => {
    // Given
    uploaderFactory.build.mockReturnValue(() => Promise.reject(new Error('broken stream')));

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    // When/Then
    await expect(sut.run(temporalFile)).rejects.toThrow();

    calls(open).toHaveLength(1);
    calls(uploaderFactory.build).toHaveLength(1);
    calls(eventBus.publish).toHaveLength(0);
    call(stopWatching).toStrictEqual([]);
    // The snapshot is released even when the upload fails.
    call(dispose).toStrictEqual([]);
  });

  it('should not let a failed snapshot cleanup replace a successful upload', async () => {
    dispose.mockRejectedValue(new Error('could not remove the snapshot'));

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    // The upload is already committed and the event already published by the
    // time cleanup runs, so a cleanup failure must not report it as failed.
    await expect(sut.run(temporalFile)).resolves.toBe('contents-id');
    calls(eventBus.publish).toHaveLength(1);
  });

  it('should not let a failed snapshot cleanup hide the error the upload failed with', async () => {
    uploaderFactory.build.mockReturnValue(() => Promise.reject(new Error('broken stream')));
    dispose.mockRejectedValue(new Error('could not remove the snapshot'));

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    // Not merely "some error": the one the upload actually failed with.
    await expect(sut.run(temporalFile)).rejects.toMatchObject({ cause: 'UNKNOWN' });
    await expect(sut.run(temporalFile)).rejects.not.toThrow('could not remove the snapshot');
  });

  it('should reject oversized temporal files before opening the upload stream', async () => {
    configGetMock.mockReturnValue(100);

    const uploader = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await expect(uploader.run(temporalFile)).rejects.toThrow('UPLOAD_SIZE_LIMIT_EXCEEDED');
    expect(isUploadSizeLimitBlockedPath('/file.txt')).toBe(true);
    expect(uploaderFactory.build).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should reject temporal files when drive space is insufficient before opening the upload stream', async () => {
    configGetMock.mockReturnValue(101);
    validateSpaceMock.mockResolvedValue({ data: { hasSpace: false } });

    const uploader = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await expect(uploader.run(temporalFile)).rejects.toMatchObject({
      cause: 'NOT_ENOUGH_SPACE',
      message: 'The size of the file to upload is greater than the available space',
    });
    expect(repository.watchFile).not.toHaveBeenCalled();
    expect(repository.createUploadSnapshot).not.toHaveBeenCalled();
    expect(uploaderFactory.build).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should continue upload when the stored limit is unavailable', async () => {
    configGetMock.mockReturnValue(0);

    const uploader = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await expect(uploader.run(temporalFile)).resolves.toBe('contents-id');
    expect(repository.createUploadSnapshot).toHaveBeenCalledWith(temporalFile.path);
    expect(uploaderFactory.build).toHaveBeenCalled();
  });

  it('should upload temporal files when they fit the stored limit', async () => {
    configGetMock.mockReturnValue(101);

    const uploader = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await expect(uploader.run(temporalFile)).resolves.toBe('contents-id');
    expect(repository.createUploadSnapshot).toHaveBeenCalledWith(temporalFile.path);
    expect(uploaderFactory.build).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should skip upload for zero-byte files and only publish creation event', async () => {
    const uploader = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await expect(uploader.run(emptyTemporalFile)).resolves.toBe('');
    calls(repository.watchFile).toHaveLength(0);
    calls(repository.createUploadSnapshot).toHaveLength(0);
    calls(repository.read).toHaveLength(0);
    calls(uploaderFactory.read).toHaveLength(0);
    calls(eventBus.publish).toHaveLength(1);

    expect(eventBus.publish.mock.calls[0]?.[0]).toMatchObject([
      {
        aggregateId: '',
        size: 0,
        path: '/new-zero-file.png',
        replaces: undefined,
        contentFilePath: undefined,
        fileBuffer: undefined,
      },
    ]);
  });
});
