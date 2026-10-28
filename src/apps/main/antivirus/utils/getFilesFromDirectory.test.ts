/* eslint-disable @typescript-eslint/no-explicit-any */
import { PathTypeChecker } from '../../../shared/fs/PathTypeChecker ';
import { isPermissionError } from './isPermissionError';
import { readdir } from 'fs/promises';
import { logger } from '@internxt/drive-desktop-core/build/backend';

vi.mock('fs/promises');
vi.mock('../../../shared/fs/PathTypeChecker ');
vi.mock('./isPermissionError');
vi.mock('child_process');
vi.mock('util');
vi.mock('@internxt/drive-desktop-core/build/backend', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { countSystemFiles, getFilesFromDirectory } from './getFilesFromDirectory';

describe('getFilesFromDirectory', () => {
  const mockReaddir = vi.mocked(readdir);
  const mockPathTypeChecker = vi.mocked(PathTypeChecker);
  const mockIsPermissionError = vi.mocked(isPermissionError);
  const mockLogger = vi.mocked(logger);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a single file', async () => {
    const testFile = '/path/to/file.txt';
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const abortController = new AbortController();
    mockPathTypeChecker.isFile.mockResolvedValue(true);

    await getFilesFromDirectory({ dir: testFile, cb: mockCallback, signal: abortController.signal });

    expect(mockPathTypeChecker.isFile).toBeCalledWith(testFile);
    expect(mockCallback).toBeCalledWith(testFile);
    expect(mockReaddir).not.toBeCalled();
  });

  it('should process files in a directory', async () => {
    const testDir = '/path/to/dir';
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const abortController = new AbortController();
    const mockItems = [
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'file2.txt', isDirectory: () => false },
    ];

    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockResolvedValue(mockItems as any);

    await getFilesFromDirectory({ dir: testDir, cb: mockCallback, signal: abortController.signal });

    expect(mockPathTypeChecker.isFile).toBeCalledWith(testDir);
    expect(mockReaddir).toBeCalledWith(testDir, { withFileTypes: true });
    expect(mockCallback).toBeCalledTimes(2);
    expect(mockCallback).toBeCalledWith('/path/to/dir/file1.txt');
    expect(mockCallback).toBeCalledWith('/path/to/dir/file2.txt');
  });

  it('should filter out .tmp files and temp/tmp directories', async () => {
    const testDir = '/path/to/dir';
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const abortController = new AbortController();
    const mockItems = [
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'file2.tmp', isDirectory: () => false },
      { name: 'tmp', isDirectory: () => true },
    ];

    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockResolvedValue(mockItems as any);

    await getFilesFromDirectory({ dir: testDir, cb: mockCallback, signal: abortController.signal });

    expect(mockCallback).toBeCalledTimes(1);
    expect(mockCallback).toBeCalledWith('/path/to/dir/file1.txt');
    expect(mockCallback).not.toBeCalledWith('/path/to/dir/file2.tmp');
    expect(mockCallback).not.toBeCalledWith('/path/to/dir/tmp');
  });

  it('should recursively process subdirectories', async () => {
    const testDir = '/path/to/dir';
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const abortController = new AbortController();
    const mockItems = [
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'subdir', isDirectory: () => true },
    ];
    const mockSubItems = [{ name: 'file1.txt', isDirectory: () => false }];

    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockResolvedValueOnce(mockItems as any);
    mockReaddir.mockResolvedValueOnce(mockSubItems as any);

    await getFilesFromDirectory({ dir: testDir, cb: mockCallback, signal: abortController.signal });

    expect(mockReaddir).toBeCalledWith(testDir, { withFileTypes: true });
    expect(mockReaddir).toBeCalledWith('/path/to/dir/subdir', {
      withFileTypes: true,
    });
    expect(mockCallback).toBeCalledWith('/path/to/dir/file1.txt');
    expect(mockCallback).toBeCalledWith('/path/to/dir/subdir/file1.txt');
  });

  it('should handle permission errors when reading directory', async () => {
    const testDir = '/path/to/dir';
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const abortController = new AbortController();
    const permissionError = new Error('Permission denied') as NodeJS.ErrnoException;
    permissionError.code = 'EACCES';

    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockRejectedValue(permissionError);
    mockIsPermissionError.mockReturnValue(true);

    const result = await getFilesFromDirectory({ dir: testDir, cb: mockCallback, signal: abortController.signal });

    expect(mockIsPermissionError).toBeCalledWith(permissionError);
    expect(mockLogger.error).toBeCalledWith(
      expect.objectContaining({
        tag: 'ANTIVIRUS',
        msg: expect.stringContaining('Skipping directory'),
      }),
    );
    expect(result).toBeUndefined();
    expect(mockCallback).not.toBeCalled();
  });

  it('should handle non-permission errors and continue scanning', async () => {
    const testDir = '/path/to/dir';
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const abortController = new AbortController();
    const nonPermissionError = new Error('Other error');

    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockRejectedValue(nonPermissionError);
    mockIsPermissionError.mockReturnValue(false);

    const result = await getFilesFromDirectory({ dir: testDir, cb: mockCallback, signal: abortController.signal });

    expect(mockIsPermissionError).toBeCalledWith(nonPermissionError);
    expect(mockLogger.warn).toBeCalledWith(
      expect.objectContaining({
        tag: 'ANTIVIRUS',
        msg: expect.stringContaining('Error reading directory'),
        error: nonPermissionError,
      }),
    );
    expect(result).toBeUndefined();
    expect(mockCallback).not.toBeCalled();
  });

  it('should handle permission errors in subdirectories', async () => {
    const testDir = '/path/to/dir';
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const abortController = new AbortController();
    const mockItems = [
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'subdir', isDirectory: () => true },
    ];
    const permissionError = new Error('Permission denied') as NodeJS.ErrnoException;
    permissionError.code = 'EACCES';

    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockResolvedValueOnce(mockItems as any);
    mockReaddir.mockRejectedValueOnce(permissionError);
    mockIsPermissionError.mockReturnValue(true);

    await getFilesFromDirectory({ dir: testDir, cb: mockCallback, signal: abortController.signal });

    expect(mockCallback).toBeCalledWith('/path/to/dir/file1.txt');
    expect(mockLogger.debug).toBeCalledWith(
      expect.objectContaining({
        tag: 'ANTIVIRUS',
        msg: expect.stringContaining('Skipping subdirectory'),
      }),
    );
  });

  it('should skip the Internxt Drive mount without reading it', async () => {
    const testDir = '/mock/home';
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    const abortController = new AbortController();
    const mockItems = [
      { name: 'notes.txt', isDirectory: () => false },
      { name: 'Internxt Drive', isDirectory: () => true },
    ];

    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockResolvedValue(mockItems as unknown as Awaited<ReturnType<typeof readdir>>);

    await getFilesFromDirectory({ dir: testDir, cb: mockCallback, signal: abortController.signal });

    expect(mockReaddir).toHaveBeenCalledTimes(1);
    expect(mockReaddir).toHaveBeenCalledWith(testDir, { withFileTypes: true });
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('/mock/home/notes.txt');
    expect(mockPathTypeChecker.isFile).not.toHaveBeenCalledWith('/mock/home/Internxt Drive');
    expect(mockLogger.debug).toHaveBeenCalledWith({
      tag: 'ANTIVIRUS',
      msg: 'Skipping Internxt Drive mount',
      pathName: '/mock/home/Internxt Drive',
    });
  });

  it('should not count files inside the Internxt Drive mount', async () => {
    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockResolvedValue([
      { name: 'notes.txt', isDirectory: () => false },
      { name: 'Internxt Drive', isDirectory: () => true },
    ] as unknown as Awaited<ReturnType<typeof readdir>>);

    const total = await countSystemFiles('/mock/home');

    expect(total).toBe(1);
    expect(mockReaddir).toHaveBeenCalledTimes(1);
    expect(mockPathTypeChecker.isFile).not.toHaveBeenCalledWith('/mock/home/Internxt Drive');
  });

  it('should count sibling directories in parallel without reading all of them at once', async () => {
    const directoryCount = 12;
    let inFlight = 0;
    let maxInFlight = 0;

    mockPathTypeChecker.isFile.mockResolvedValue(false);
    mockReaddir.mockImplementation(async (dir) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => {
        setTimeout(resolve, 15);
      });
      inFlight -= 1;

      if (dir === '/mock/home') {
        return Array.from({ length: directoryCount }, (_, index) => ({
          name: `dir-${index}`,
          isDirectory: () => true,
        })) as unknown as Awaited<ReturnType<typeof readdir>>;
      }

      return [{ name: 'file.txt', isDirectory: () => false }] as unknown as Awaited<ReturnType<typeof readdir>>;
    });

    const total = await countSystemFiles('/mock/home');

    expect(total).toBe(directoryCount);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThan(directoryCount);
  });
});
