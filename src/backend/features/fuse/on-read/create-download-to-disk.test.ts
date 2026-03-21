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
  const resolveAllWaitersMock = vi.fn();
  const rejectAllWaitersMock = vi.fn();
  const waitForBytesMock = vi.fn();
  const getBytesAvailableMock = vi.fn().mockReturnValue(0);
  const getBytesWrittenMock = vi.fn();

  const streamFileToDiskMock = partialSpyOn(streamFileToDiskModule, 'streamFileToDisk');
  const createWaiterQueueMock = partialSpyOn(waiterQueueModule, 'createWaiterQueue');

  beforeEach(() => {
    fakeWriteStream.removeAllListeners();

    createWaiterQueueMock.mockReturnValue({
      resolveWaiters: resolveWaitersMock,
      resolveAllWaiters: resolveAllWaitersMock,
      rejectAllWaiters: rejectAllWaitersMock,
      waitForBytes: waitForBytesMock,
      getBytesAvailable: getBytesAvailableMock,
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

    createDownloadToDisk(stream, '/tmp/file', { onProgress, onFinished: vi.fn(), onError: vi.fn() });

    const onBytesWritten = streamFileToDiskMock.mock.calls[0][2];
    onBytesWritten(100);

    expect(resolveWaitersMock).toHaveBeenCalledWith(100);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('should resolve remaining waiters and resolveAll on writeStream finish', () => {
    const onFinished = vi.fn();
    const stream = new PassThrough();
    getBytesWrittenMock.mockReturnValue(500);

    createDownloadToDisk(stream, '/tmp/file', { onProgress: vi.fn(), onFinished, onError: vi.fn() });

    fakeWriteStream.emit('finish');

    expect(resolveWaitersMock).toHaveBeenCalledWith(500);
    expect(resolveAllWaitersMock).toHaveBeenCalledOnce();
    expect(onFinished).toHaveBeenCalledOnce();
  });

  it('should reject all waiters on writeStream error', () => {
    const onError = vi.fn();
    const stream = new PassThrough();
    const error = new Error('write failed');

    createDownloadToDisk(stream, '/tmp/file', { onProgress: vi.fn(), onFinished: vi.fn(), onError });

    fakeWriteStream.emit('error', error);

    expect(rejectAllWaitersMock).toHaveBeenCalledWith(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should reject all waiters on input stream error', () => {
    const onError = vi.fn();
    const stream = new PassThrough();
    const error = new Error('download failed');

    createDownloadToDisk(stream, '/tmp/file', { onProgress: vi.fn(), onFinished: vi.fn(), onError });

    stream.emit('error', error);

    expect(rejectAllWaitersMock).toHaveBeenCalledWith(error);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should delegate waitForBytes to the waiter queue', () => {
    const stream = new PassThrough();
    waitForBytesMock.mockResolvedValue(undefined);

    const writer = createDownloadToDisk(stream, '/tmp/file', { onProgress: vi.fn(), onFinished: vi.fn(), onError: vi.fn() });

    writer.waitForBytes(10, 20);

    expect(waitForBytesMock).toHaveBeenCalledWith(10, 20);
  });

  it('should expose getBytesAvailable from the waiter queue', () => {
    const stream = new PassThrough();
    getBytesAvailableMock.mockReturnValue(42);

    const writer = createDownloadToDisk(stream, '/tmp/file', { onProgress: vi.fn(), onFinished: vi.fn(), onError: vi.fn() });

    expect(writer.getBytesAvailable()).toBe(42);
  });

  it('should destroy both streams, reject waiters, and delete file on destroy', async () => {
    const stream = new PassThrough();
    const streamDestroySpy = vi.spyOn(stream, 'destroy');
    const writeStreamDestroySpy = vi.spyOn(fakeWriteStream, 'destroy');

    const writer = createDownloadToDisk(stream, '/tmp/file', { onProgress: vi.fn(), onFinished: vi.fn(), onError: vi.fn() });

    await writer.destroy();

    expect(streamDestroySpy).toHaveBeenCalledOnce();
    expect(writeStreamDestroySpy).toHaveBeenCalledOnce();
    expect(rejectAllWaitersMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: '[createDownloadToDisk] Destroyed' }),
    );
    expect(unlinkMock).toHaveBeenCalledWith('/tmp/file');
  });
});
