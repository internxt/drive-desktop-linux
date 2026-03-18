import { PassThrough } from 'node:stream';
import { createDownloadToDisk } from './create-download-to-disk';
import * as streamFileToDiskModule from './stream-file-to-disk';
import * as waiterQueueModule from './create-waiter-queue';
import * as unlinkModule from 'node:fs/promises';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';

vi.mock(import('node:fs/promises'));

const unlinkMock = vi.mocked(unlinkModule.unlink);

describe('createDownloadToDisk', () => {
  const fakeWriteStream = new PassThrough();
  const resolveWaitersMock = vi.fn();
  const rejectAllWaitersMock = vi.fn();
  const waitForBytesMock = vi.fn();
  const getBytesWrittenMock = vi.fn();

  const streamFileToDiskMock = partialSpyOn(streamFileToDiskModule, 'streamFileToDisk');
  const createWaiterQueueMock = partialSpyOn(waiterQueueModule, 'createWaiterQueue');

  beforeEach(() => {
    createWaiterQueueMock.mockReturnValue({
      resolveWaiters: resolveWaitersMock,
      rejectAllWaiters: rejectAllWaitersMock,
      waitForBytes: waitForBytesMock,
    });

    streamFileToDiskMock.mockReturnValue({
      writeStream: fakeWriteStream as unknown as ReturnType<
        typeof streamFileToDiskModule.streamFileToDisk
      >['writeStream'],
      getBytesWritten: getBytesWrittenMock,
    });

    unlinkMock.mockResolvedValue(undefined);
  });

  it('should call resolveWaiters and onProgress when bytes are written', () => {
    const onProgress = vi.fn();
    const stream = new PassThrough();

    createDownloadToDisk(stream, '/tmp/file', onProgress);

    const onBytesWritten = streamFileToDiskMock.mock.calls[0][2];
    onBytesWritten(100);

    expect(resolveWaitersMock).toHaveBeenCalledWith(100);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('should resolve remaining waiters and reject the rest on writeStream finish', () => {
    const stream = new PassThrough();
    getBytesWrittenMock.mockReturnValue(500);

    createDownloadToDisk(stream, '/tmp/file', vi.fn());

    fakeWriteStream.emit('finish');

    expect(resolveWaitersMock).toHaveBeenCalledWith(500);
    expect(rejectAllWaitersMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: '[createDownloadToDisk] Stream ended before all bytes were served' }),
    );
  });

  it('should reject all waiters on writeStream error', () => {
    const stream = new PassThrough();
    const error = new Error('write failed');

    createDownloadToDisk(stream, '/tmp/file', vi.fn());

    fakeWriteStream.emit('error', error);

    expect(rejectAllWaitersMock).toHaveBeenCalledWith(error);
  });

  it('should reject all waiters on input stream error', () => {
    const stream = new PassThrough();
    const error = new Error('download failed');

    createDownloadToDisk(stream, '/tmp/file', vi.fn());

    stream.emit('error', error);

    expect(rejectAllWaitersMock).toHaveBeenCalledWith(error);
  });

  it('should delegate waitForBytes to the waiter queue', () => {
    const stream = new PassThrough();
    waitForBytesMock.mockResolvedValue(undefined);

    const writer = createDownloadToDisk(stream, '/tmp/file', vi.fn());

    writer.waitForBytes(10, 20);

    expect(waitForBytesMock).toHaveBeenCalledWith(10, 20);
  });

  it('should destroy both streams, reject waiters, and delete file on destroy', async () => {
    const stream = new PassThrough();
    const streamDestroySpy = vi.spyOn(stream, 'destroy');
    const writeStreamDestroySpy = vi.spyOn(fakeWriteStream, 'destroy');

    const writer = createDownloadToDisk(stream, '/tmp/file', vi.fn());

    await writer.destroy();

    expect(streamDestroySpy).toHaveBeenCalledOnce();
    expect(writeStreamDestroySpy).toHaveBeenCalledOnce();
    expect(rejectAllWaitersMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: '[createDownloadToDisk] Destroyed' }),
    );
    expect(unlinkMock).toHaveBeenCalledWith('/tmp/file');
  });
});
