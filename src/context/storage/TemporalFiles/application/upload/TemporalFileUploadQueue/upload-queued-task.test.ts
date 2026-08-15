import { describe, expect, it, vi } from 'vitest';
import type { TemporalFile } from '../../../domain/TemporalFile';
import { uploadQueuedTask } from './upload-queued-task';

describe('upload-queued-task', () => {
  it('should pass replace info when the file already exists', async () => {
    const uploader = {
      run: vi.fn().mockResolvedValue('contents-id'),
    };
    const fileSearcher = {
      run: vi.fn().mockResolvedValue({ contentsId: 'contents-1', name: 'file', type: 'txt' }),
    };
    const task = {
      temporalFile: { path: '/tmp/file.txt' } as unknown as TemporalFile,
      path: '/target/file.txt',
      processName: 'process',
    };

    await uploadQueuedTask({ task, uploader, fileSearcher } as never);

    expect(fileSearcher.run).toHaveBeenCalledWith({ path: '/target/file.txt', status: 'EXISTS' });
    expect(uploader.run).toHaveBeenCalledWith(task.temporalFile, {
      contentsId: 'contents-1',
      name: 'file',
      extension: 'txt',
    });
  });

  it('should upload without replacements when the file does not exist', async () => {
    const uploader = {
      run: vi.fn().mockResolvedValue('contents-id'),
    };
    const fileSearcher = {
      run: vi.fn().mockResolvedValue(undefined),
    };
    const task = {
      temporalFile: { path: '/tmp/file.txt' } as unknown as TemporalFile,
      path: '/target/file.txt',
      processName: 'process',
    };

    await uploadQueuedTask({ task, uploader, fileSearcher } as never);

    expect(uploader.run).toHaveBeenCalledWith(task.temporalFile, undefined);
  });
});
