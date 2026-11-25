import type { Stats } from 'node:fs';
import { vi } from 'vitest';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { LocalFileMother } from '../../../../context/local/localFile/domain/__test-helpers__/LocalFileMother';
import { AbsolutePath } from '../../../../context/local/localFile/infrastructure/AbsolutePath';
import * as safeStatModule from '../../../../infra/local-file-system/safe-stat';
import { resolveLocalFileForBackupUpload } from './resolve-local-file-for-backup-upload';

vi.mock(import('../../../../infra/local-file-system/safe-stat'));

const safeStatMock = vi.mocked(safeStatModule.safeStat);

function fileStats(size: number, mtimeMs: number): Stats {
  return {
    isFile: () => true,
    isDirectory: () => false,
    size,
    mtime: new Date(mtimeMs),
    birthtime: new Date(mtimeMs),
    birthtimeMs: mtimeMs,
    ctime: new Date(mtimeMs),
  } as Stats;
}

describe('resolve-local-file-for-backup-upload', () => {
  it('returns current metadata when the file matches the tree scan', async () => {
    const mtimeMs = 1_700_000_000_000;
    const localFile = LocalFileMother.fromPartial({
      path: '/home/user/file.txt' as AbsolutePath,
      size: 100,
      modificationTime: mtimeMs,
      creationTime: mtimeMs,
    });
    safeStatMock.mockResolvedValue({ data: fileStats(100, mtimeMs) });

    const result = await resolveLocalFileForBackupUpload({ localFile });

    expect(result.data).toEqual({
      kind: 'ready',
      upload: {
        path: localFile.path,
        size: 100,
        modificationTime: new Date(mtimeMs),
        creationTime: new Date(mtimeMs),
      },
    });
  });

  it('uploads the stable version when the file changed once since the tree scan', async () => {
    const scannedMtime = 1_700_000_000_000;
    const currentMtime = 1_700_000_100_000;
    const localFile = LocalFileMother.fromPartial({
      path: '/home/user/file.txt' as AbsolutePath,
      size: 100,
      modificationTime: scannedMtime,
    });
    safeStatMock
      .mockResolvedValueOnce({ data: fileStats(200, currentMtime) })
      .mockResolvedValueOnce({ data: fileStats(200, currentMtime) });

    const result = await resolveLocalFileForBackupUpload({ localFile });

    expect(result.data).toEqual({
      kind: 'ready',
      upload: expect.objectContaining({
        size: 200,
        modificationTime: new Date(currentMtime),
      }),
    });
    expect(safeStatMock).toHaveBeenCalledTimes(2);
  });

  it('defers when the file is still changing between reads', async () => {
    const localFile = LocalFileMother.fromPartial({
      path: '/home/user/file.txt' as AbsolutePath,
      size: 100,
      modificationTime: 1_700_000_000_000,
    });
    safeStatMock
      .mockResolvedValueOnce({ data: fileStats(200, 1_700_000_100_000) })
      .mockResolvedValueOnce({ data: fileStats(300, 1_700_000_200_000) });

    const result = await resolveLocalFileForBackupUpload({ localFile });

    expect(result.data).toEqual({ kind: 'deferred' });
  });

  it('returns stat errors from safeStat', async () => {
    const localFile = LocalFileMother.fromPartial({});
    const statError = new DriveDesktopError('NOT_EXISTS', 'missing');
    safeStatMock.mockResolvedValue({ error: statError });

    const result = await resolveLocalFileForBackupUpload({ localFile });

    expect(result.error).toBe(statError);
  });
});
