import { describe, it, vi } from 'vitest';
import { call, calls } from '../../../../../tests/vitest/utils.helper';
import { handleReleaseCallback } from './handle-release-callback';
import { TemporalFile } from '../../../../context/storage/TemporalFiles/domain/TemporalFile';

vi.mock(import('@internxt/drive-desktop-core/build/backend'));

function createTemporalFile(path: string): TemporalFile {
  return TemporalFile.from({
    path,
    size: 100,
    createdAt: new Date(),
    modifiedAt: new Date(),
  });
}

function createAuxiliaryFile(path: string): TemporalFile {
  return TemporalFile.from({
    path,
    size: 0,
    createdAt: new Date(),
    modifiedAt: new Date(),
  });
}

describe('handle-release-callback', () => {
  const findTemporalFile = vi.fn<(path: string) => Promise<TemporalFile | undefined>>();
  const uploadTemporalFile = vi.fn<(path: string) => Promise<string>>();
  const deleteTemporalFile = vi.fn<(path: string) => Promise<void>>();

  it('should return right when no temporal file is found', async () => {
    findTemporalFile.mockResolvedValue(undefined);

    const result = await handleReleaseCallback({
      path: '/Documents/file.pdf',
      findTemporalFile,
      uploadTemporalFile,
      deleteTemporalFile,
    });

    expect(result.isRight()).toBe(true);
    calls(findTemporalFile).toHaveLength(1);
    calls(uploadTemporalFile).toHaveLength(0);
  });

  it('should skip upload for auxiliary files', async () => {
    findTemporalFile.mockResolvedValue(createAuxiliaryFile('/Documents/.~lock.file.odt#'));

    const result = await handleReleaseCallback({
      path: '/Documents/.~lock.file.odt#',
      findTemporalFile,
      uploadTemporalFile,
      deleteTemporalFile,
    });

    expect(result.isRight()).toBe(true);
    calls(findTemporalFile).toHaveLength(1);
    calls(uploadTemporalFile).toHaveLength(0);
  });

  it('should upload temporal file and returns right on success', async () => {
    findTemporalFile.mockResolvedValue(createTemporalFile('/Documents/report.pdf'));
    uploadTemporalFile.mockResolvedValue('contents-id-123');

    const result = await handleReleaseCallback({
      path: '/Documents/report.pdf',
      findTemporalFile,
      uploadTemporalFile,
      deleteTemporalFile,
    });

    expect(result.isRight()).toBe(true);
    calls(findTemporalFile).toHaveLength(1);
    call(uploadTemporalFile).toBe('/Documents/report.pdf');
  });

  it('should delete temporal file and return left when upload fails', async () => {
    findTemporalFile.mockResolvedValue(createTemporalFile('/Documents/report.pdf'));
    uploadTemporalFile.mockRejectedValue(new Error('Network error'));

    const result = await handleReleaseCallback({
      path: '/Documents/report.pdf',
      findTemporalFile,
      uploadTemporalFile,
      deleteTemporalFile,
    });

    expect(result.isLeft()).toBe(true);
    call(deleteTemporalFile).toBe('/Documents/report.pdf');
  });

  it('should return left when findTemporalFile throws an error', async () => {
    findTemporalFile.mockRejectedValue(new Error('DB error'));

    const result = await handleReleaseCallback({
      path: '/Documents/report.pdf',
      findTemporalFile,
      uploadTemporalFile,
      deleteTemporalFile,
    });

    expect(result.isLeft()).toBe(true);
    calls(uploadTemporalFile).toHaveLength(0);
    calls(deleteTemporalFile).toHaveLength(0);
  });
});
