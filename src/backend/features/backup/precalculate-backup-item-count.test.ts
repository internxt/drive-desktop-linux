import { describe, it, expect, beforeEach, vi } from 'vitest';
import { left, right } from '../../../context/shared/domain/Either';
import LocalTreeBuilder from '../../../context/local/localTree/application/LocalTreeBuilder';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { DiffFilesCalculatorService } from '../../../apps/backups/diff/DiffFilesCalculatorService';
import { FoldersDiffCalculator } from '../../../apps/backups/diff/FoldersDiffCalculator';
import { precalculateBackupItemCount } from './precalculate-backup-item-count';
import { AbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';

describe('precalculateBackupItemCount', () => {
  const backupInfo = {
    folderUuid: 'folder-uuid',
    folderId: 42,
    tmpPath: '/tmp/backup',
    backupsBucket: 'bucket',
    pathname: '/home/user/Documents' as AbsolutePath,
    name: 'Documents',
  };

  const localTree = { root: { path: '/home/user/Documents' } };
  const remoteTree = { root: { path: '/remote/Documents' } };

  let localTreeBuilder: { run: ReturnType<typeof vi.fn> };
  let remoteTreeBuilder: { run: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localTreeBuilder = {
      run: vi.fn(),
    };

    remoteTreeBuilder = {
      run: vi.fn(),
    };
  });

  it('returns total item count when precalculation succeeds', async () => {
    localTreeBuilder.run.mockResolvedValue(right(localTree));
    remoteTreeBuilder.run.mockResolvedValue(remoteTree);

    vi.spyOn(DiffFilesCalculatorService, 'calculate').mockReturnValue({ total: 7 } as never);
    vi.spyOn(FoldersDiffCalculator, 'calculate').mockReturnValue({ total: 3 } as never);

    const result = await precalculateBackupItemCount(
      backupInfo,
      localTreeBuilder as unknown as LocalTreeBuilder,
      remoteTreeBuilder as unknown as RemoteTreeBuilder,
    );

    expect(result.data).toBe(10);
    expect(localTreeBuilder.run).toBeCalledWith(backupInfo.pathname);
    expect(remoteTreeBuilder.run).toBeCalledWith(backupInfo.folderId, backupInfo.folderUuid, true);
  });

  it('returns an error when local tree build returns left', async () => {
    localTreeBuilder.run.mockResolvedValue(left(new Error('local tree error')));

    const filesSpy = vi.spyOn(DiffFilesCalculatorService, 'calculate');
    const foldersSpy = vi.spyOn(FoldersDiffCalculator, 'calculate');

    const result = await precalculateBackupItemCount(
      backupInfo,
      localTreeBuilder as unknown as LocalTreeBuilder,
      remoteTreeBuilder as unknown as RemoteTreeBuilder,
    );

    expect(result.error).toBeDefined();
    expect(remoteTreeBuilder.run).not.toHaveBeenCalled();
    expect(filesSpy).not.toHaveBeenCalled();
    expect(foldersSpy).not.toHaveBeenCalled();
  });

  it('returns an error when localTreeBuilder throws', async () => {
    const runError = new Error('unexpected failure');
    localTreeBuilder.run.mockRejectedValue(runError);

    const result = await precalculateBackupItemCount(
      backupInfo,
      localTreeBuilder as unknown as LocalTreeBuilder,
      remoteTreeBuilder as unknown as RemoteTreeBuilder,
    );

    expect(result.error).toBe(runError);
  });

  it('returns an error when remoteTreeBuilder throws', async () => {
    const runError = new Error('remote failure');
    localTreeBuilder.run.mockResolvedValue(right(localTree));
    remoteTreeBuilder.run.mockRejectedValue(runError);

    const result = await precalculateBackupItemCount(
      backupInfo,
      localTreeBuilder as unknown as LocalTreeBuilder,
      remoteTreeBuilder as unknown as RemoteTreeBuilder,
    );

    expect(result.error).toBe(runError);
  });
});
