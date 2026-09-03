import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { mockDeep } from 'vitest-mock-extended';
import { partialSpyOn } from '../../../../../../tests/vitest/utils.helper';
import configStore from '../../../../../apps/main/config';
import * as validateSpaceModule from '../../../../../backend/features/usage/validate-space';
import { EventBus } from '../../../../virtual-drive/shared/domain/EventBus';
import { TemporalFile } from '../../domain/TemporalFile';
import { TemporalFilePath } from '../../domain/TemporalFilePath';
import { TemporalFileUploaderFactory } from '../../domain/upload/TemporalFileUploaderFactory';
import { NodeTemporalFileRepository } from '../../infrastructure/NodeTemporalFileRepository';
import { TemporalFileUploader } from './TemporalFileUploader';

type Attempt = { declaredLength: number; bytesStreamed: number; content: string };

/**
 * Records what each upload attempt actually promised and actually sent.
 *
 * It reads the declared length the same way EnvironmentTemporalFileUploaderFactory
 * does, so it observes the production contract rather than a rephrasing of it.
 */
class RecordingUploaderFactory implements TemporalFileUploaderFactory {
  readonly attempts: Array<Attempt> = [];
  failNextAttempts = 0;
  /** Runs after an attempt has been recorded, so a test can change the world between attempts. */
  afterAttempt: (attemptNumber: number) => Promise<void> = async () => {};

  private _readable: Readable | undefined;
  private _document: TemporalFile | undefined;

  read(readable: Readable) {
    this._readable = readable;
    return this;
  }

  document(document: TemporalFile) {
    this._document = document;
    return this;
  }

  replaces() {
    return this;
  }

  abort() {
    return this;
  }

  build(contentLength?: number) {
    const readable = this._readable;
    const document = this._document;

    if (!readable || !document) {
      throw new Error('Readable and document are needed to upload a file');
    }

    const declaredLength = contentLength ?? document.size.value;

    return async () => {
      const chunks: Array<Buffer> = [];

      for await (const chunk of readable) {
        chunks.push(Buffer.from(chunk));
      }

      const content = Buffer.concat(chunks);
      this.attempts.push({ declaredLength, bytesStreamed: content.byteLength, content: content.toString() });

      await this.afterAttempt(this.attempts.length);

      if (this.failNextAttempts > 0) {
        this.failNextAttempts -= 1;

        // EnvironmentTemporalFileUploader destroys the readable on both its
        // error and its abort path, so a double that does not is not modelling
        // production. Without this a snapshot whose stream owns the descriptor
        // passes here and fails on a real retry.
        if (!readable.destroyed) {
          readable.destroy();
        }

        // The shape the transient error handler classifies as retryable.
        return Promise.reject({ status: 429, message: JSON.stringify({ retry_after: 0.001 }) });
      }

      return 'contents-id';
    };
  }
}

describe('TemporalFileUploader upload consistency', () => {
  const configGetMock = partialSpyOn(configStore, 'get');
  const validateSpaceMock = partialSpyOn(validateSpaceModule, 'validateSpace');
  const eventBus = mockDeep<EventBus>();

  let folder: string;
  let repository: NodeTemporalFileRepository;
  let uploaderFactory: RecordingUploaderFactory;

  const documentPath = new TemporalFilePath('/Documents/database.txt');

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'internxt-upload-consistency-'));
    repository = new NodeTemporalFileRepository(folder);
    repository.init();
    uploaderFactory = new RecordingUploaderFactory();

    eventBus.publish.mockResolvedValue(undefined);
    configGetMock.mockReturnValue(0);
    validateSpaceMock.mockResolvedValue({ data: { hasSpace: true } });
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  /**
   * Writes `content` to the backing file of `documentPath`, which is what an
   * application writing through FUSE ends up doing.
   */
  async function writeBackingFile(content: string) {
    const buffer = Buffer.from(content);
    await repository.truncate(documentPath, 0);
    await repository.write(documentPath, buffer, buffer.byteLength, 0);
  }

  async function buildTemporalFile(): Promise<TemporalFile> {
    const found = await repository.find(documentPath);
    return found.get();
  }

  it('should declare the same number of bytes it streams when the file grew after the attributes were read', async () => {
    await repository.create(documentPath);
    await writeBackingFile('the size this upload was planned with');

    const temporalFile = await buildTemporalFile();

    // The application keeps writing between the stat and the upload, which is
    // what produces RequestContentLengthMismatchError in production.
    await writeBackingFile('the bytes that are actually on disk when the upload runs');

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await sut.run(temporalFile);

    const attempt = uploaderFactory.attempts[0];
    expect(attempt.declaredLength).toBe(attempt.bytesStreamed);
  });

  it('should declare and send the same bytes on every retry attempt', async () => {
    await repository.create(documentPath);
    await writeBackingFile('the size this upload was planned with');

    const temporalFile = await buildTemporalFile();

    await writeBackingFile('the bytes that are actually on disk when the upload runs');

    // One transient failure, and nothing touches the file afterwards, so the
    // retry is the only thing under test here.
    uploaderFactory.failNextAttempts = 1;

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await sut.run(temporalFile);

    expect(uploaderFactory.attempts).toHaveLength(2);
    expect(uploaderFactory.attempts[1].content).toBe(uploaderFactory.attempts[0].content);

    uploaderFactory.attempts.forEach((attempt) => {
      expect(attempt.declaredLength).toBe(attempt.bytesStreamed);
    });
  });

  it('should hold the declared length when the file grows between two attempts', async () => {
    await repository.create(documentPath);
    await writeBackingFile('the bytes this upload declared');

    const temporalFile = await buildTemporalFile();

    // Nothing is copied aside, so the retry re-reads the same file the
    // application is still writing to. The declared length has to survive that.
    uploaderFactory.failNextAttempts = 1;
    uploaderFactory.afterAttempt = async (attemptNumber) => {
      if (attemptNumber === 1) {
        await writeBackingFile('the bytes this upload declared, and a great many more added later');
      }
    };

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await sut.run(temporalFile);

    expect(uploaderFactory.attempts).toHaveLength(2);

    uploaderFactory.attempts.forEach((attempt) => {
      expect(attempt.declaredLength).toBe(attempt.bytesStreamed);
    });
  });

  it('should reject a file that grew past the upload limit after its size was read', async () => {
    await repository.create(documentPath);
    await writeBackingFile('small enough');

    const temporalFile = await buildTemporalFile();

    // Between the two, a limit that the recorded size passes and the file on
    // disk does not.
    configGetMock.mockReturnValue(20);
    await writeBackingFile('far too much content to be allowed past the limit');

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await expect(sut.run(temporalFile)).rejects.toThrow('UPLOAD_SIZE_LIMIT_EXCEEDED');
    expect(uploaderFactory.attempts).toHaveLength(0);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should publish the number of bytes it uploaded, not the size read earlier', async () => {
    await repository.create(documentPath);
    await writeBackingFile('short');

    const temporalFile = await buildTemporalFile();

    await writeBackingFile('a much longer set of contents than the one that was measured');

    const sut = new TemporalFileUploader(repository, uploaderFactory, eventBus);

    await sut.run(temporalFile);

    const attempt = uploaderFactory.attempts[0];
    expect(eventBus.publish.mock.calls[0]?.[0]).toMatchObject([{ size: attempt.bytesStreamed }]);
  });
});
