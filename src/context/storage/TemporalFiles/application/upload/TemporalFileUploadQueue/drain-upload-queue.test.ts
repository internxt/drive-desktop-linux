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

  it('should requeue a failed upload and keep it pending until it succeeds', async () => {
    const state = createTemporalFileUploadQueueState();
    const firstTask = {
      temporalFile: { path: '/staged/first.txt' },
      path: '/target/first.txt',
      processName: 'first',
    };
    const secondTask = {
      temporalFile: { path: '/staged/second.txt' },
      path: '/target/second.txt',
      processName: 'second',
    };
    state.tasks.push(firstTask as never, secondTask as never);
    state.queuedPaths.add(firstTask.path);
    state.queuedPaths.add(secondTask.path);

    const deleter = { run: vi.fn().mockResolvedValue(undefined) };

    vi.mocked(uploadQueuedTask)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    await drainUploadQueue({
      repository: {} as never,
      uploader: {} as never,
      deleter,
      fileSearcher: {} as never,
      state,
    } as never);

    expect(uploadQueuedTask).toHaveBeenCalledTimes(3);
    expect(deleter.run).toHaveBeenCalledTimes(2);
    expect(state.tasks).toHaveLength(0);
    expect(state.queuedPaths.size).toBe(0);
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
