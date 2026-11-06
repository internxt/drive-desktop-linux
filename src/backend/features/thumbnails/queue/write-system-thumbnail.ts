import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS } from '../../../../core/electron/paths';
import type { Result } from '../../../../context/shared/domain/Result';

const THUMBNAIL_SIZES = ['normal', 'large'] as const;
type ThumbnailSize = (typeof THUMBNAIL_SIZES)[number];

type WriteSystemThumbnailProps = {
  readonly filePath: string;
  readonly fileSize: number;
  readonly modificationTime: Date;
  readonly thumbnails: Readonly<Record<ThumbnailSize, Buffer>>;
};

export async function writeSystemThumbnail({
  filePath,
  fileSize,
  modificationTime,
  thumbnails,
}: WriteSystemThumbnailProps): Promise<Result<void>> {
  const uri = pathToFileURL(filePath).href;
  const cacheKey = createHash('md5').update(uri).digest('hex');
  const metadataResult = addThumbnailMetadata({
    thumbnails,
    metadata: {
      'Thumb::URI': uri,
      'Thumb::MTime': String(Math.floor(modificationTime.getTime() / 1000)),
      'Thumb::Size': String(fileSize),
      'Thumb::Mimetype': getImageMimeType({ filePath }),
      'Thumb::Software': 'Internxt Drive',
    },
  });

  if (metadataResult.error) {
    return { error: metadataResult.error };
  }

  try {
    await Promise.all(
      THUMBNAIL_SIZES.map(async (size) => {
        const directory = join(PATHS.THUMBNAILS_FOLDER, size);
        const outputPath = join(directory, `${cacheKey}.png`);
        const temporaryPath = `${outputPath}.${randomUUID()}.tmp`;
        await mkdir(directory, { recursive: true, mode: 0o700 });
        try {
          await writeFile(temporaryPath, metadataResult.data[size], { mode: 0o600 });
          await rename(temporaryPath, outputPath);
        } catch (error) {
          await unlink(temporaryPath).catch(ignoreMissingFile);
          throw error;
        }
      }),
    );
    return { data: undefined };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to write system thumbnail') };
  }
}

type AddThumbnailMetadataProps = {
  readonly thumbnails: Readonly<Record<ThumbnailSize, Buffer>>;
  readonly metadata: Readonly<Record<string, string>>;
};

function addThumbnailMetadata({
  thumbnails,
  metadata,
}: AddThumbnailMetadataProps): Result<Record<ThumbnailSize, Buffer>> {
  const chunks = Object.entries(metadata).map(([key, value]) => createTextChunk({ key, value }));
  const normal = insertMetadata({ thumbnail: thumbnails.normal, chunks });
  if (normal.error) return { error: normal.error };
  const large = insertMetadata({ thumbnail: thumbnails.large, chunks });
  if (large.error) return { error: large.error };

  return {
    data: {
      normal: normal.data,
      large: large.data,
    },
  };
}

function insertMetadata({
  thumbnail,
  chunks,
}: {
  readonly thumbnail: Buffer;
  readonly chunks: readonly Buffer[];
}): Result<Buffer> {
  let offset = 8;

  while (offset + 12 <= thumbnail.length) {
    const chunkLength = thumbnail.readUInt32BE(offset);
    const chunkType = thumbnail.toString('ascii', offset + 4, offset + 8);
    const chunkEnd = offset + 12 + chunkLength;
    if (chunkEnd > thumbnail.length) break;

    if (chunkType === 'IEND') {
      return {
        data: Buffer.concat([thumbnail.subarray(0, offset), ...chunks, thumbnail.subarray(offset)]),
      };
    }

    offset = chunkEnd;
  }

  return { error: new Error('Generated thumbnail is not a complete PNG') };
}

function createTextChunk({ key, value }: { readonly key: string; readonly value: string }) {
  const chunkType = Buffer.from('tEXt');
  const chunkData = Buffer.concat([Buffer.from(key, 'latin1'), Buffer.from([0]), Buffer.from(value, 'utf8')]);
  const chunk = Buffer.alloc(12 + chunkData.length);
  chunk.writeUInt32BE(chunkData.length, 0);
  chunkType.copy(chunk, 4);
  chunkData.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([chunkType, chunkData])), 8 + chunkData.length);
  return chunk;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getImageMimeType({ filePath }: { readonly filePath: string }) {
  const extension = extname(filePath).toLowerCase();
  return extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
}

function ignoreMissingFile(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return;
  throw error;
}
