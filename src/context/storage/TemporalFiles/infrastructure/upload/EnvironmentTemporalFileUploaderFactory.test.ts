import { Environment } from '@internxt/inxt-js';
import { Readable } from 'node:stream';
import { mockDeep } from 'vitest-mock-extended';
import { UploadProgressTracker } from '../../../../shared/domain/UploadProgressTracker';
import { TemporalFile } from '../../domain/TemporalFile';
import { EnvironmentTemporalFileUploaderFactory } from './EnvironmentTemporalFileUploaderFactory';

describe('EnvironmentTemporalFileUploaderFactory', () => {
  const environment = mockDeep<Environment>();
  const progressTracker = mockDeep<UploadProgressTracker>();

  /** The size recorded when the domain object was built, before the file grew. */
  const staleSize = 101;
  const contentLength = 202;

  const temporalFile = TemporalFile.from({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    path: '/file.txt',
    size: staleSize,
  });

  function build() {
    const sut = new EnvironmentTemporalFileUploaderFactory(environment, 'bucket', progressTracker);

    return sut
      .read(Readable.from(['content']))
      .document(temporalFile)
      .build(contentLength);
  }

  beforeEach(() => {
    environment.upload.mockImplementation(async (_bucket, opts) => {
      opts.progressCallback(1, 0, 0);
      return 'contents-id';
    });
  });

  it('should declare the length it was given and not the size the document was built with', async () => {
    await build()();

    expect(environment.upload.mock.calls[0]?.[1]).toMatchObject({ fileSize: contentLength });
  });

  it('should report progress against the length being uploaded', async () => {
    await build()();

    expect(progressTracker.uploadStarted).toHaveBeenCalledWith('file', 'txt', contentLength);
  });
});
