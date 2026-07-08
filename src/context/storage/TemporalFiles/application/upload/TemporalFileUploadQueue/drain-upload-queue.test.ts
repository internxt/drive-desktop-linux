import { describe, expect, it, vi } from 'vitest';
import { UploadSizeLimitError } from '../../../../../../backend/features/user/file-size-limit/upload-size-limit-error';
import { createTemporalFileUploadQueueState } from './state';
import { drainUploadQueue } from './drain-upload-queue';

vi.mock('./upload-queued-task', () => ({
  uploadQueuedTask: vi.fn(),
}));

vi.mock('./preserve-rejected-upload', () => ({
  preserveRejectedUpload: vi.fn(),
}));

import { uploadQueuedTask } from './upload-queued-task';
import { preserveRejectedUpload } from './preserve-rejected-upload';

describe('drain-upload-queue', () => {
  it('should process queued tasks and clear state', async () => {
    const state = createTemporalFileUploadQueueState();
    const task = {
      temporalFile: { path: '/staged/file.txt' },
      path: '/target/file.txt',
      processName: 'process',
    };
    state.tasks.push(task as never);
    state.queuedPaths.add(task.path);

    const deleter = { run: vi.fn().mockResolvedValue(undefined) };

    vi.mocked(uploadQueuedTask).mockResolvedValue(undefined);

    await drainUploadQueue({
      repository: {} as never,
      uploader: {} as never,
      deleter,
      fileSearcher: {} as never,
      state,
    } as never);

    expect(uploadQueuedTask).toHaveBeenCalledTimes(1);
    expect(deleter.run).toHaveBeenCalledWith(task.path);
    expect(state.tasks).toHaveLength(0);
    expect(state.queuedPaths.has(task.path)).toBe(false);
    expect(state.draining).toBe(false);
  });

  it('should preserve oversized uploads', async () => {
    const state = createTemporalFileUploadQueueState();
    const task = {
      temporalFile: { path: '/staged/file.txt' },
      path: '/target/file.txt',
      processName: 'process',
    };
    state.tasks.push(task as never);
    state.queuedPaths.add(task.path);

    const deleter = { run: vi.fn().mockResolvedValue(undefined) };

    vi.mocked(uploadQueuedTask).mockRejectedValue(new UploadSizeLimitError());

    await drainUploadQueue({
      repository: {} as never,
      uploader: {} as never,
      deleter,
      fileSearcher: {} as never,
      state,
    } as never);

    expect(preserveRejectedUpload).toHaveBeenCalledTimes(1);
    expect(deleter.run).not.toHaveBeenCalled();
    expect(state.tasks).toHaveLength(0);
    expect(state.queuedPaths.has(task.path)).toBe(false);
  });
});
