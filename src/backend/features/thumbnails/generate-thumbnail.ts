import { nativeImage } from 'electron';
import { Result } from '../../../context/shared/domain/Result';
import { THUMBNAIL_SIZE } from './thumbnail.constants';

export function generateThumbnail(fileBuffer: Buffer): Result<Buffer, Error> {
  const image = nativeImage.createFromBuffer(fileBuffer);

  if (image.isEmpty()) {
    return { error: new Error('Failed to load image from buffer') };
  }

  const { width, height } = image.getSize();
  const scale = Math.min(THUMBNAIL_SIZE / width, THUMBNAIL_SIZE / height, 1);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  const resized = image.resize({ width: newWidth, height: newHeight, quality: 'good' });

  return { data: resized.toPNG() };
}
