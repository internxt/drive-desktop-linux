import * as detectModule from './detect-available';
import * as fileExistsModule from '../../../apps/shared/fs/fileExists';
import { getFileManagerType, isInstalled, reloadFileManager } from './service';
import { partialSpyOn } from 'tests/vitest/utils.helper';

const { execMock } = vi.hoisted(() => ({
  execMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  exec: execMock,
}));

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    link: vi.fn(),
    cp: vi.fn(),
    rm: vi.fn(),
  },
}));

describe('service', () => {
  const detectAvailableFileManagerMock = partialSpyOn(detectModule, 'detectAvailableFileManager');
  const doesFileExistMock = partialSpyOn(fileExistsModule, 'doesFileExist');

  beforeEach(() => {
    vi.clearAllMocks();
    detectAvailableFileManagerMock.mockResolvedValue('nautilus');
    doesFileExistMock.mockResolvedValue(false);
  });

  describe('getFileManagerType', () => {
    it('should return nautilus when available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nautilus');

      // When
      const result = await getFileManagerType();

      // Then
      expect(result).toBe('nautilus');
    });

    it('should return nemo when available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nemo');

      // When
      const result = await getFileManagerType();

      // Then
      expect(result).toBe('nemo');
    });

    it('should return dolphin when available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('dolphin');

      // When
      const result = await getFileManagerType();

      // Then
      expect(result).toBe('dolphin');
    });

    it('should return null when no file manager is available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce(null);

      // When
      const result = await getFileManagerType();

      // Then
      expect(result).toBeNull();
    });
  });

  describe('isInstalled', () => {
    it('should return false when no file manager is available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce(null);

      // When
      const result = await isInstalled();

      // Then
      expect(result).toBe(false);
    });

    it('should return false when nautilus extension file does not exist', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nautilus');
      doesFileExistMock.mockResolvedValueOnce(false);

      // When
      const result = await isInstalled();

      // Then
      expect(result).toBe(false);
    });

    it('should return true when nautilus extension file exists', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nautilus');
      doesFileExistMock.mockResolvedValueOnce(true);

      // When
      const result = await isInstalled();

      // Then
      expect(result).toBe(true);
    });

    it('should return true when nemo extension file exists', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nemo');
      doesFileExistMock.mockResolvedValueOnce(true);

      // When
      const result = await isInstalled();

      // Then
      expect(result).toBe(true);
    });

    it('should return true when dolphin extension assets exist', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('dolphin');
      doesFileExistMock.mockResolvedValueOnce(true);
      doesFileExistMock.mockResolvedValueOnce(true);
      doesFileExistMock.mockResolvedValueOnce(true);

      // When
      const result = await isInstalled();

      // Then
      expect(result).toBe(true);
    });
  });

  describe('reloadFileManager', () => {
    it('should resolve immediately if no file manager is available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce(null);

      // When
      await reloadFileManager();

      // Then
      expect(execMock).not.toHaveBeenCalled();
    });

    it('should execute nautilus -q when nautilus is available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nautilus');
      execMock.mockImplementation((cmd, callback) => {
        expect(cmd).toBe('nautilus -q');
        callback(null, '', '');
      });

      // When
      await reloadFileManager();

      // Then
      expect(execMock).toHaveBeenCalled();
    });

    it('should execute nemo -q when nemo is available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nemo');
      execMock.mockImplementation((cmd, callback) => {
        expect(cmd).toBe('nemo -q');
        callback(null, '', '');
      });

      // When
      await reloadFileManager();

      // Then
      expect(execMock).toHaveBeenCalled();
    });

    it('should execute dolphin reload command when dolphin is available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('dolphin');
      execMock.mockImplementation((cmd, callback) => {
        expect(cmd).toBe('kquitapp6 dolphin || kquitapp5 dolphin || true');
        callback(null, '', '');
      });

      // When
      await reloadFileManager();

      // Then
      expect(execMock).toHaveBeenCalled();
    });

    it('should ignore dolphin stderr when dolphin is not running', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('dolphin');
      execMock.mockImplementation((cmd, callback) => {
        expect(cmd).toBe('kquitapp6 dolphin || kquitapp5 dolphin || true');
        callback(
          null,
          '',
          'Application dolphin could not be found using service org.kde.dolphin and path /MainApplication.',
        );
      });

      // When
      await reloadFileManager();

      // Then
      expect(execMock).toHaveBeenCalled();
    });

    it('should reject unexpected dolphin stderr', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('dolphin');
      execMock.mockImplementation((cmd, callback) => {
        expect(cmd).toBe('kquitapp6 dolphin || kquitapp5 dolphin || true');
        callback(null, '', 'unexpected dolphin stderr');
      });

      // When / Then
      await expect(reloadFileManager()).rejects.toThrow('unexpected dolphin stderr');
    });

    it('should handle exit code 255 gracefully', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nautilus');
      const error = { code: 255 } as unknown as NodeJS.ErrnoException;
      execMock.mockImplementation((cmd, callback) => {
        callback(error, '', '');
      });

      // When
      await reloadFileManager();

      // Then - should not throw
      expect(true).toBe(true);
    });
  });
});
