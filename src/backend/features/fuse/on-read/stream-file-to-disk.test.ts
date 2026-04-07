import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import * as ensureFolderExistsModule from '../../../../apps/shared/fs/ensure-folder-exists';
import { streamFileToDisk } from './stream-file-to-disk';
import { call, calls, partialSpyOn } from '../../../../../tests/vitest/utils.helper';

describe('stream-file-to-disk', () => {
  const createWriteStreamMock = partialSpyOn(fs, 'createWriteStream');
  const ensureFolderExistsMock = partialSpyOn(ensureFolderExistsModule, 'ensureFolderExists');

  let fakeWriteStream: PassThrough & { bytesWritten: number };

  beforeEach(() => {
    fakeWriteStream = Object.assign(new PassThrough(), { bytesWritten: 0 });
    createWriteStreamMock.mockReturnValue(fakeWriteStream as unknown as fs.WriteStream);
  });

  it('should ensure the destination folder exists before creating the stream', () => {
    // Given
    const readable = new PassThrough();

    // When
    streamFileToDisk(readable, '/home/dev/.config/internxt/downloaded/file-id', vi.fn());

    // Then
    call(ensureFolderExistsMock).toBe('/home/dev/.config/internxt/downloaded');
    call(createWriteStreamMock).toBe('/home/dev/.config/internxt/downloaded/file-id');
  });

  it('should pipe the readable into the write stream', () => {
    // Given
    const readable = new PassThrough();
    const pipeSpy = partialSpyOn(readable, 'pipe', false);

    // When
    streamFileToDisk(readable, '/tmp/file', vi.fn());

    // Then
    call(pipeSpy).toBe(fakeWriteStream);
  });

  it('should call onProgress with bytesWritten when data is received', () => {
    // Given
    const readable = new PassThrough();
    const onProgress = vi.fn();
    fakeWriteStream.bytesWritten = 100;

    // When
    streamFileToDisk(readable, '/tmp/file', onProgress);
    readable.emit('data', Buffer.alloc(100));

    // Then
    call(onProgress).toBe(100);
  });

  it('should call onProgress with bytesWritten on drain', () => {
    // Given
    const readable = new PassThrough();
    const onProgress = vi.fn();
    fakeWriteStream.bytesWritten = 200;

    // When
    streamFileToDisk(readable, '/tmp/file', onProgress);
    fakeWriteStream.emit('drain');

    // Then
    call(onProgress).toBe(200);
  });

  it('should return the write stream', () => {
    // Given
    const readable = new PassThrough();

    // When
    const result = streamFileToDisk(readable, '/tmp/file', vi.fn());

    // Then
    expect(result.writeStream).toBe(fakeWriteStream);
  });

  it('should return getBytesWritten that tracks progress', () => {
    // Given
    const readable = new PassThrough();

    // When
    const result = streamFileToDisk(readable, '/tmp/file', vi.fn());

    // Then
    expect(result.getBytesWritten()).toBe(0);

    // Given
    fakeWriteStream.bytesWritten = 500;

    // When
    readable.emit('data', Buffer.alloc(500));

    // Then
    expect(result.getBytesWritten()).toBe(500);
  });

  it('should create the write stream once', () => {
    // Given
    const readable = new PassThrough();

    // When
    streamFileToDisk(readable, '/tmp/file', vi.fn());

    // Then
    calls(createWriteStreamMock).toHaveLength(1);
  });
});
