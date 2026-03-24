import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import { streamFileToDisk } from './stream-file-to-disk';
import { deepMocked } from '../../../../../tests/vitest/utils.helper';

vi.mock(import('node:fs'));

const fsMock = deepMocked(fs);

describe('streamFileToDisk', () => {
  let fakeWriteStream: PassThrough & { bytesWritten: number };

  beforeEach(() => {
    fakeWriteStream = Object.assign(new PassThrough(), { bytesWritten: 0 });
    fsMock.createWriteStream.mockReturnValue(fakeWriteStream as any);
  });

  it('should create a write stream at the given file path', () => {
    const readable = new PassThrough();

    streamFileToDisk(readable, '/tmp/file', vi.fn());

    expect(fsMock.createWriteStream).toHaveBeenCalledWith('/tmp/file');
  });

  it('should pipe the readable into the write stream', () => {
    const readable = new PassThrough();
    const pipeSpy = vi.spyOn(readable, 'pipe');

    streamFileToDisk(readable, '/tmp/file', vi.fn());

    expect(pipeSpy).toHaveBeenCalledWith(fakeWriteStream);
  });

  it('should call onProgress with bytesWritten when data is received', () => {
    const readable = new PassThrough();
    const onProgress = vi.fn();
    fakeWriteStream.bytesWritten = 100;

    streamFileToDisk(readable, '/tmp/file', onProgress);
    readable.emit('data', Buffer.alloc(100));

    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('should call onProgress with bytesWritten on drain', () => {
    const readable = new PassThrough();
    const onProgress = vi.fn();
    fakeWriteStream.bytesWritten = 200;

    streamFileToDisk(readable, '/tmp/file', onProgress);
    fakeWriteStream.emit('drain');

    expect(onProgress).toHaveBeenCalledWith(200);
  });

  it('should return the write stream', () => {
    const readable = new PassThrough();

    const result = streamFileToDisk(readable, '/tmp/file', vi.fn());

    expect(result.writeStream).toBe(fakeWriteStream);
  });

  it('should return getBytesWritten that tracks progress', () => {
    const readable = new PassThrough();

    const result = streamFileToDisk(readable, '/tmp/file', vi.fn());

    expect(result.getBytesWritten()).toBe(0);

    fakeWriteStream.bytesWritten = 500;
    readable.emit('data', Buffer.alloc(500));

    expect(result.getBytesWritten()).toBe(500);
  });
});
