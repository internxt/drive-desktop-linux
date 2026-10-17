import { nativeImage } from 'electron';
import { open } from 'node:fs/promises';
import { generateThumbnail, generateThumbnailFromPath, generateThumbnailVariantsFromPath } from './generate-thumbnail';
import { call, calls, deepMocked, partialSpyOn } from 'tests/vitest/utils.helper';
import { THUMBNAIL_SIZE } from './thumbnail.constants';

vi.mock('electron', () => ({
  nativeImage: {
    createFromBuffer: vi.fn(),
    createFromPath: vi.fn(),
  },
}));
vi.mock(import('node:fs/promises'));

describe('generate-thumbnail', () => {
  const createFromBufferMock = partialSpyOn(nativeImage, 'createFromBuffer');
  const createFromPathMock = partialSpyOn(nativeImage, 'createFromPath');
  const openMock = deepMocked(open);

  function mockHeaderFile(buffer: Buffer) {
    const handle = {
      read: vi.fn().mockImplementation(async (targetBuf: Buffer) => {
        const bytesRead = buffer.copy(targetBuf, 0, 0, Math.min(targetBuf.length, buffer.length));
        return { bytesRead, buffer: targetBuf };
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    openMock.mockResolvedValue(handle as never);
    return handle;
  }

  it('returns error when nativeImage cannot decode the buffer', () => {
    createFromBufferMock.mockReturnValue({ isEmpty: () => true });
    const { error } = generateThumbnail(Buffer.from('not-an-image'));
    expect(error).toBeInstanceOf(Error);
  });

  it('resizes image larger than THUMBNAIL_SIZE', () => {
    const imageWidth = 1024;
    const imageHeight = 768;
    const pngBuffer = Buffer.from('png');
    const resizeMock = vi.fn().mockReturnValue({ toPNG: () => pngBuffer });

    createFromBufferMock.mockReturnValue({
      isEmpty: () => false,
      getSize: () => ({ width: imageWidth, height: imageHeight }),
      resize: resizeMock,
    });

    const { data, error } = generateThumbnail(Buffer.from('large-image'));

    expect(error).toBeUndefined();
    const scale = Math.min(THUMBNAIL_SIZE / imageWidth, THUMBNAIL_SIZE / imageHeight, 1);
    expect(resizeMock).toBeCalledWith({
      width: Math.round(imageWidth * scale),
      height: Math.round(imageHeight * scale),
      quality: 'good',
    });
    expect(data).toBe(pngBuffer);
  });

  it('does not upscale image smaller than THUMBNAIL_SIZE', () => {
    const imageWidth = 100;
    const imageHeight = 80;
    const pngBuffer = Buffer.from('png');
    const resizeMock = vi.fn().mockReturnValue({ toPNG: () => pngBuffer });

    createFromBufferMock.mockReturnValue({
      isEmpty: () => false,
      getSize: () => ({ width: imageWidth, height: imageHeight }),
      resize: resizeMock,
    });
    generateThumbnail(Buffer.from('small-image'));

    expect(resizeMock).toBeCalledWith({ width: imageWidth, height: imageHeight, quality: 'good' });
  });

  it('generates a thumbnail from an image file path', () => {
    const pngBuffer = Buffer.from('png');
    const resizeMock = vi.fn().mockReturnValue({ toPNG: () => pngBuffer });
    createFromPathMock.mockReturnValue({
      isEmpty: () => false,
      getSize: () => ({ width: 400, height: 300 }),
      resize: resizeMock,
    });

    const result = generateThumbnailFromPath({ filePath: '/cache/photo.jpg' });

    expect(result.data).toBe(pngBuffer);
    expect(createFromPathMock).toHaveBeenCalledWith('/cache/photo.jpg');
  });

  it.each([
    { format: 'JPEG', signature: [255, 216, 255, 0, 0, 0, 0, 0] },
    { format: 'PNG', signature: [137, 80, 78, 71, 13, 10, 26, 10] },
  ])('generates correctly sized variants from extensionless cached $format data', async ({ signature }) => {
    const handle = mockHeaderFile(Buffer.from(signature));
    const resizeMock = vi
      .fn()
      .mockReturnValueOnce({ toPNG: () => Buffer.from('normal') })
      .mockReturnValueOnce({ toPNG: () => Buffer.from('large') });
    createFromPathMock.mockReturnValue({
      isEmpty: () => false,
      getSize: () => ({ width: 800, height: 600 }),
      resize: resizeMock,
    });

    const result = await generateThumbnailVariantsFromPath({ filePath: '/cache/content-id' });

    expect(result.data).toStrictEqual({ normal: Buffer.from('normal'), large: Buffer.from('large') });
    expect(openMock).toHaveBeenCalledWith('/cache/content-id', 'r');
    expect(handle.close).toHaveBeenCalledOnce();
    call(createFromPathMock).toBe('/cache/content-id');
    expect(resizeMock).toHaveBeenNthCalledWith(1, { width: 128, height: 96, quality: 'good' });
    expect(resizeMock).toHaveBeenNthCalledWith(2, { width: 256, height: 192, quality: 'good' });
  });

  it.each([
    { content: 'an HTML error page', buffer: Buffer.from('<html><title>503 backend read error</title></html>') },
    { content: 'an empty file', buffer: Buffer.alloc(0) },
    { content: 'preallocated zeros', buffer: Buffer.alloc(452) },
  ])('rejects $content stored as an image without invoking the decoder', async ({ buffer }) => {
    mockHeaderFile(buffer);

    const result = await generateThumbnailVariantsFromPath({ filePath: '/cache/content-id' });

    expect(result.error?.message).toBe('Cached file does not contain PNG or JPEG image data');
    expect(result.data).toBeUndefined();
    calls(createFromPathMock).toHaveLength(0);
  });

  it('reports decode failures for image data with a valid signature', async () => {
    mockHeaderFile(Buffer.from([255, 216, 255, 0, 0, 0, 0, 0]));
    createFromPathMock.mockReturnValue({ isEmpty: () => true });

    const result = await generateThumbnailVariantsFromPath({ filePath: '/cache/content-id' });

    expect(result.error?.message).toBe('Cached image data could not be decoded as PNG or JPEG');
    expect(result.data).toBeUndefined();
  });

  it('preserves filesystem errors when reading cached media fails', async () => {
    const error = new Error('permission denied');
    openMock.mockRejectedValue(error);

    const result = await generateThumbnailVariantsFromPath({ filePath: '/cache/content-id' });

    expect(result.error).toBe(error);
    calls(createFromPathMock).toHaveLength(0);
  });
});
