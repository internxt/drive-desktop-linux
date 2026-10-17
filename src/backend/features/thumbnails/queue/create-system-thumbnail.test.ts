import { join } from 'node:path';
import { PATHS } from '../../../../core/electron/paths';
import type { File } from '../../../../context/virtual-drive/files/domain/File';
import * as generateThumbnailModule from '../generate-thumbnail';
import * as invalidateSystemThumbnailModule from './invalidate-system-thumbnail';
import * as writeSystemThumbnailModule from './write-system-thumbnail';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { createSystemThumbnail } from './create-system-thumbnail';

describe('create-system-thumbnail', () => {
  const generateThumbnailVariantsFromPathMock = partialSpyOn(
    generateThumbnailModule,
    'generateThumbnailVariantsFromPath',
  );
  const invalidateSystemThumbnailMock = partialSpyOn(invalidateSystemThumbnailModule, 'invalidateSystemThumbnail');
  const writeSystemThumbnailMock = partialSpyOn(writeSystemThumbnailModule, 'writeSystemThumbnail');

  const mockImageFile = {
    path: '/photos/photo.jpg',
    nameWithExtension: 'photo.jpg',
    size: 2048,
    type: 'jpg',
    modificationTime: new Date('2025-01-01T00:00:00.000Z'),
  } as unknown as File;

  const mockVideoFile = {
    path: '/videos/clip.mp4',
    nameWithExtension: 'clip.mp4',
    size: 1048576,
    type: 'mp4',
    modificationTime: new Date('2025-01-01T00:00:00.000Z'),
  } as unknown as File;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateSystemThumbnailMock.mockResolvedValue(undefined);
    writeSystemThumbnailMock.mockResolvedValue({ data: undefined });
    generateThumbnailVariantsFromPathMock.mockResolvedValue({
      data: { normal: Buffer.from('normal'), large: Buffer.from('large') },
    });
  });

  it('should invalidate system thumbnail and return true for unsupported thumbnail generation files (e.g. video)', async () => {
    const result = await createSystemThumbnail({
      file: mockVideoFile,
      sourceFilePath: '/cache/video-content-id',
    });

    expect(result).toBe(true);
    expect(invalidateSystemThumbnailMock).toHaveBeenCalledWith({
      filePath: join(PATHS.ROOT_DRIVE_FOLDER, 'videos/clip.mp4'),
    });
    expect(generateThumbnailVariantsFromPathMock).not.toHaveBeenCalled();
    expect(writeSystemThumbnailMock).not.toHaveBeenCalled();
  });

  it('should generate and write thumbnails for supported image files', async () => {
    const result = await createSystemThumbnail({
      file: mockImageFile,
      sourceFilePath: '/cache/image-content-id',
    });

    expect(result).toBe(true);
    expect(generateThumbnailVariantsFromPathMock).toHaveBeenCalledWith({
      filePath: '/cache/image-content-id',
    });
    expect(writeSystemThumbnailMock).toHaveBeenCalledWith({
      filePath: join(PATHS.ROOT_DRIVE_FOLDER, 'photos/photo.jpg'),
      fileSize: 2048,
      modificationTime: mockImageFile.modificationTime,
      thumbnails: { normal: Buffer.from('normal'), large: Buffer.from('large') },
    });
  });

  it('should return false if generateThumbnailVariantsFromPath returns error', async () => {
    generateThumbnailVariantsFromPathMock.mockResolvedValue({
      error: new Error('Corrupt image'),
    });

    const result = await createSystemThumbnail({
      file: mockImageFile,
      sourceFilePath: '/cache/image-content-id',
    });

    expect(result).toBe(false);
    expect(writeSystemThumbnailMock).not.toHaveBeenCalled();
  });

  it('should return false if writeSystemThumbnail throws error', async () => {
    writeSystemThumbnailMock.mockResolvedValue({
      error: new Error('Disk write failure'),
    });

    const result = await createSystemThumbnail({
      file: mockImageFile,
      sourceFilePath: '/cache/image-content-id',
    });

    expect(result).toBe(false);
  });

  it('should detect path traversal and return false without writing', async () => {
    const maliciousFile = {
      path: '../../etc/passwd',
      nameWithExtension: 'passwd',
      size: 100,
      type: 'jpg',
      modificationTime: new Date(),
    } as unknown as File;

    const result = await createSystemThumbnail({
      file: maliciousFile,
      sourceFilePath: '/cache/image-content-id',
    });

    expect(result).toBe(false);
    expect(writeSystemThumbnailMock).not.toHaveBeenCalled();
    expect(invalidateSystemThumbnailMock).not.toHaveBeenCalled();
  });
});
