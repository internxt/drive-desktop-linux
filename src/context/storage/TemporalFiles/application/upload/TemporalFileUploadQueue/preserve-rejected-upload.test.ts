import { describe, expect, it, vi } from 'vitest';
import type { TemporalFile } from '../../../domain/TemporalFile';
import { preserveRejectedUpload } from './preserve-rejected-upload';

vi.mock('../../../../../../backend/features/user/file-size-limit', () => ({
  preserveRejectedFileSizeTooBig: vi.fn(),
}));

import { preserveRejectedFileSizeTooBig } from '../../../../../../backend/features/user/file-size-limit';

describe('preserve-rejected-upload', () => {
  it('should skip preservation when the content path is missing', async () => {
    const deleter = { run: vi.fn() };
    const task = {
      temporalFile: {
        contentFilePath: undefined,
        size: { value: 123 },
      } as unknown as TemporalFile,
      path: '/target/file.txt',
      processName: 'process',
    };

    await preserveRejectedUpload({ task, deleter } as never);

    expect(preserveRejectedFileSizeTooBig).not.toHaveBeenCalled();
    expect(deleter.run).not.toHaveBeenCalled();
  });

  it('should preserve and delete the rejected file when the copy succeeds', async () => {
    const deleter = { run: vi.fn().mockResolvedValue(undefined) };
    const task = {
      temporalFile: {
        contentFilePath: '/tmp/content.bin',
        size: { value: 123 },
      } as unknown as TemporalFile,
      path: '/target/file.txt',
      processName: 'process',
    };

    vi.mocked(preserveRejectedFileSizeTooBig).mockResolvedValue({ error: undefined } as never);

    await preserveRejectedUpload({ task, deleter } as never);

    expect(preserveRejectedFileSizeTooBig).toHaveBeenCalledWith({
      originalPath: '/target/file.txt',
      temporalContentPath: '/tmp/content.bin',
      size: 123,
    });
    expect(deleter.run).toHaveBeenCalledWith('/target/file.txt');
  });
});
