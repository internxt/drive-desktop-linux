import { nativeImage } from 'electron';
import { open } from 'node:fs/promises';
import { Result } from '../../../context/shared/domain/Result';
import { THUMBNAIL_NORMAL_SIZE, THUMBNAIL_SIZE } from './thumbnail.constants';

export function generateThumbnail(fileBuffer: Buffer): Result<Buffer, Error> {
  const image = nativeImage.createFromBuffer(fileBuffer);
  return resizeThumbnail({ image });
}

type GenerateThumbnailFromPathProps = {
  readonly filePath: string;
};

export function generateThumbnailFromPath({ filePath }: GenerateThumbnailFromPathProps): Result<Buffer, Error> {
  const image = nativeImage.createFromPath(filePath);
  return resizeThumbnail({ image });
}

export async function generateThumbnailVariantsFromPath({
  filePath,
}: GenerateThumbnailFromPathProps): Promise<Result<{ normal: Buffer; large: Buffer }, Error>> {
  const validHeader = await isValidImageHeader(filePath);
  if (validHeader.error) return { error: validHeader.error };

  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) return { error: new Error('Cached image data could not be decoded as PNG or JPEG') };

  const normal = resizeThumbnail({ image, maxSize: THUMBNAIL_NORMAL_SIZE });
  if (normal.error) return { error: normal.error };
  const large = resizeThumbnail({ image, maxSize: THUMBNAIL_SIZE });
  if (large.error) return { error: large.error };

  return { data: { normal: normal.data, large: large.data } };
}

async function isValidImageHeader(filePath: string): Promise<Result<void>> {
  try {
    const handle = await open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(8);
      const { bytesRead } = await handle.read(buffer, 0, 8, 0);
      if (bytesRead < 8) {
        return { error: new Error('Cached file does not contain PNG or JPEG image data') };
      }
      const isPng = buffer.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpeg = buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
      if (!isPng && !isJpeg) {
        return { error: new Error('Cached file does not contain PNG or JPEG image data') };
      }
      return { data: undefined };
    } finally {
      await handle.close();
    }
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Could not read cached image data') };
  }
}

function resizeThumbnail({
  image,
  maxSize = THUMBNAIL_SIZE,
}: {
  image: Electron.NativeImage;
  maxSize?: number;
}): Result<Buffer, Error> {
  if (image.isEmpty()) {
    return { error: new Error('Failed to load image from buffer') };
  }

  const { width, height } = image.getSize();
  const scale = Math.min(maxSize / width, maxSize / height, 1);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  const resized = image.resize({ width: newWidth, height: newHeight, quality: 'good' });

  return { data: resized.toPNG() };
}
