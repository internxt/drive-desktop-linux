import { ReadableStream, WritableStream } from 'node:stream/web';

const { closeMock, createWriteStreamMock, mkdirMock, openMock, convertToWritableStreamMock } = vi.hoisted(() => ({
  closeMock: vi.fn().mockResolvedValue(undefined),
  createWriteStreamMock: vi.fn(),
  mkdirMock: vi.fn().mockResolvedValue(undefined),
  openMock: vi.fn(),
  convertToWritableStreamMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  mkdir: mkdirMock,
  open: openMock,
}));

vi.mock('./convert-to-writable-stream', () => ({
  convertToWritableStream: convertToWritableStreamMock,
}));

import { call } from 'tests/vitest/utils.helper';
import { writeDownloadStreamToFile } from './write-download-stream-to-file';

describe('write-download-stream-to-file', () => {
  beforeEach(() => {
    createWriteStreamMock.mockReset();
    mkdirMock.mockReset();
    openMock.mockReset();
    convertToWritableStreamMock.mockReset();
    closeMock.mockReset();
    closeMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
  });

  it('should pipe stream to writable destination and close file handle', async () => {
    // Given
    const writable = new WritableStream<Uint8Array>({
      write() {
        return undefined;
      },
    });

    convertToWritableStreamMock.mockReturnValue(writable);
    createWriteStreamMock.mockReturnValue({});
    openMock.mockResolvedValue({
      createWriteStream: createWriteStreamMock,
      close: closeMock,
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });

    // When
    await writeDownloadStreamToFile({
      stream,
      tempFilePath: '/tmp/file.tmp',
    });

    // Then
    call(mkdirMock).toStrictEqual(['/tmp', { recursive: true }]);
    call(openMock).toStrictEqual(['/tmp/file.tmp', 'w']);
    expect(createWriteStreamMock).toHaveBeenCalledTimes(1);
    expect(convertToWritableStreamMock).toHaveBeenCalledTimes(1);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
