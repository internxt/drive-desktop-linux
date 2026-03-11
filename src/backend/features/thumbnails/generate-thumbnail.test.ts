import * as nativeImageModule from 'electron';
import { generateThumbnail } from './generate-thumbnail';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { THUMBNAIL_SIZE } from './thumbnail.constants';

describe('generate-thumbnail', () => {
  const createFromBufferMock = partialSpyOn(nativeImageModule.nativeImage, 'createFromBuffer');

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
});
