import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { left, right } from '../../../context/shared/domain/Either';
import LocalTreeBuilder from '../../../context/local/localTree/application/LocalTreeBuilder';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { DiffFilesCalculatorService } from '../../../apps/backups/diff/DiffFilesCalculatorService';
import { FoldersDiffCalculator } from '../../../apps/backups/diff/FoldersDiffCalculator';
import { Container } from 'diod';
import { precalculateBackupItemCount } from './precalculate-backup-item-count';

describe('precalculateBackupItemCount', () => {
  const backupInfo = {
    folderUuid: 'folder-uuid',
    folderId: 42,
    tmpPath: '/tmp/backup',
    backupsBucket: 'bucket',
    pathname: '/home/user/Documents',
    name: 'Documents',
  };

  const localTree = { root: { path: '/home/user/Documents' } };
  const remoteTree = { root: { path: '/remote/Documents' } };

  let localTreeBuilder: { run: ReturnType<typeof vi.fn> };
  let remoteTreeBuilder: { run: ReturnType<typeof vi.fn> };
  let container: Container;

  beforeEach(() => {
    vi.clearAllMocks();

    localTreeBuilder = {
      run: vi.fn(),
    };

    remoteTreeBuilder = {
      run: vi.fn(),
    };

    const get = vi.fn((token: unknown) => {
      if (token === LocalTreeBuilder) return localTreeBuilder;
      if (token === RemoteTreeBuilder) return remoteTreeBuilder;
      return undefined;
    });

    container = { get } as unknown as Container;
  });

  it('returns total item count when precalculation succeeds', async () => {
    localTreeBuilder.run.mockResolvedValue(right(localTree));
    remoteTreeBuilder.run.mockResolvedValue(remoteTree);

    vi.spyOn(DiffFilesCalculatorService, 'calculate').mockReturnValue({ total: 7 } as never);
    vi.spyOn(FoldersDiffCalculator, 'calculate').mockReturnValue({ total: 3 } as never);

    const count = await precalculateBackupItemCount(backupInfo, container);

    expect(count).toBe(10);
    expect(localTreeBuilder.run).toHaveBeenCalledWith(backupInfo.pathname);
    expect(remoteTreeBuilder.run).toHaveBeenCalledWith(backupInfo.folderId, backupInfo.folderUuid);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        tag: 'BACKUPS',
        msg: 'Backup item count precalculated',
        pathname: backupInfo.pathname,
        count: 10,
      }),
    );
  });

  it('returns 0 when local tree build returns left', async () => {
    localTreeBuilder.run.mockResolvedValue(left(new Error('local tree error')));

    const filesSpy = vi.spyOn(DiffFilesCalculatorService, 'calculate');
    const foldersSpy = vi.spyOn(FoldersDiffCalculator, 'calculate');

    const count = await precalculateBackupItemCount(backupInfo, container);

    expect(count).toBe(0);
    expect(remoteTreeBuilder.run).not.toHaveBeenCalled();
    expect(filesSpy).not.toHaveBeenCalled();
    expect(foldersSpy).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        tag: 'BACKUPS',
        msg: 'Error building local tree during precalculation',
        pathname: backupInfo.pathname,
      }),
    );
  });

  it('returns 0 when an exception is thrown', async () => {
    const runError = new Error('unexpected failure');
    localTreeBuilder.run.mockRejectedValue(runError);

    const count = await precalculateBackupItemCount(backupInfo, container);

    expect(count).toBe(0);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        tag: 'BACKUPS',
        msg: 'Error during backup item precalculation',
        pathname: backupInfo.pathname,
        error: runError,
      }),
    );
  });
});
