import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemporalFile } from '../../../domain/TemporalFile';
import type { TemporalFileDeleter } from '../../deletion/TemporalFileDeleter';
import type { TemporalFileUploader } from '../TemporalFileUploader';
import type { TemporalFileRepository } from '../../../domain/TemporalFileRepository';
import type { FirstsFileSearcher } from '../../../../../virtual-drive/files/application/search/FirstsFileSearcher';
import { createTemporalFileUploadQueueState } from './state';
import { enqueueUpload } from './enqueue-upload';

vi.mock('../../../../../../core/electron/paths', () => ({
  PATHS: {
    UPLOAD_QUEUE: '/tmp/internxt-drive-tmp',
  },
}));

vi.mock('./drain-upload-queue', () => ({
  drainUploadQueue: vi.fn(),
}));

import { drainUploadQueue } from './drain-upload-queue';

describe('enqueue-upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deduplicate concurrent enqueue calls for the same path', async () => {
    const state = createTemporalFileUploadQueueState();
    let resolveStage: ((value: { path: string }) => void) | undefined;
    const repository = {
      stage: vi.fn().mockImplementation(
        () =>
          new Promise<{ path: string }>((resolve) => {
            resolveStage = resolve;
          }),
      ),
    } as unknown as TemporalFileRepository;

    const props = {
      repository,
      uploader: {} as unknown as TemporalFileUploader,
      deleter: {} as unknown as TemporalFileDeleter,
      fileSearcher: {} as unknown as FirstsFileSearcher,
      state,
      temporalFile: { path: '/source/file.txt' } as unknown as TemporalFile,
      path: '/target/file.txt',
      processName: 'process',
    };

    const firstEnqueue = enqueueUpload(props);
    const secondEnqueue = enqueueUpload(props);

    resolveStage?.({ path: '/staged/file.txt' });

    await Promise.all([firstEnqueue, secondEnqueue]);

    expect(repository.stage).toHaveBeenCalledTimes(1);
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0]).toStrictEqual({
      temporalFile: { path: '/staged/file.txt' },
      path: '/target/file.txt',
      processName: 'process',
    });
  });

  it('should stage and queue a new upload', async () => {
    const state = createTemporalFileUploadQueueState();
    const repository = {
      stage: vi.fn().mockResolvedValue({ path: '/staged/file.txt' }),
    } as unknown as TemporalFileRepository;
    const context = {
      repository,
      uploader: {} as unknown as TemporalFileUploader,
      deleter: {} as unknown as TemporalFileDeleter,
      fileSearcher: {} as unknown as FirstsFileSearcher,
      state,
    };
    const temporalFile = { path: '/source/file.txt' } as unknown as TemporalFile;

    await enqueueUpload({
      ...context,
      temporalFile,
      path: '/target/file.txt',
      processName: 'process',
    });

    expect(repository.stage).toHaveBeenCalledWith(temporalFile.path, '/tmp/internxt-drive-tmp');
    expect(state.queuedPaths.has('/target/file.txt')).toBe(true);
    expect(state.tasks).toStrictEqual([
      {
        temporalFile: { path: '/staged/file.txt' },
        path: '/target/file.txt',
        processName: 'process',
      },
    ]);
    expect(drainUploadQueue).toHaveBeenCalledTimes(1);
  });

  it('should skip duplicated paths', async () => {
    const state = createTemporalFileUploadQueueState();
    state.queuedPaths.add('/target/file.txt');

    const repository = {
      stage: vi.fn(),
    } as unknown as TemporalFileRepository;

    await enqueueUpload({
      repository,
      uploader: {} as unknown as TemporalFileUploader,
      deleter: {} as unknown as TemporalFileDeleter,
      fileSearcher: {} as unknown as FirstsFileSearcher,
      state,
      temporalFile: { path: '/source/file.txt' } as unknown as TemporalFile,
      path: '/target/file.txt',
      processName: 'process',
    });

    expect(repository.stage).not.toHaveBeenCalled();
    expect(drainUploadQueue).not.toHaveBeenCalled();
  });
});
