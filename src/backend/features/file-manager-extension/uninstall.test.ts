import { logger } from '@internxt/drive-desktop-core/build/backend';
import * as serviceModule from './service';
import { call, calls, partialSpyOn } from 'tests/vitest/utils.helper';
import { uninstallFileManagerExtension } from './uninstall';

describe('uninstall', () => {
  const isInstalledMock = partialSpyOn(serviceModule, 'isInstalled');
  const deleteExtensionFileMock = partialSpyOn(serviceModule, 'deleteExtensionFile');
  const reloadFileManagerMock = partialSpyOn(serviceModule, 'reloadFileManager');
  const loggerErrorMock = partialSpyOn(logger, 'error');

  beforeEach(() => {
    isInstalledMock.mockResolvedValue(false);
    deleteExtensionFileMock.mockResolvedValue(undefined);
    reloadFileManagerMock.mockResolvedValue(undefined);
  });

  describe('uninstallFileManagerExtension', () => {
    it('should uninstall extension when it is installed', async () => {
      // Given
      isInstalledMock.mockResolvedValueOnce(true);

      // When
      await uninstallFileManagerExtension();

      // Then
      call(deleteExtensionFileMock).toStrictEqual([]);
      call(reloadFileManagerMock).toStrictEqual([]);
    });

    it('should skip uninstall when extension is not installed', async () => {
      // Given
      isInstalledMock.mockResolvedValueOnce(false);

      // When
      await uninstallFileManagerExtension();

      // Then
      calls(deleteExtensionFileMock).toHaveLength(0);
      calls(reloadFileManagerMock).toHaveLength(0);
    });

    it('should log error on uninstall failure', async () => {
      // Given
      const error = new Error('uninstall failed');
      isInstalledMock.mockResolvedValueOnce(true);
      deleteExtensionFileMock.mockRejectedValueOnce(error);

      // When
      await uninstallFileManagerExtension();

      // Then
      call(loggerErrorMock).toMatchObject({
        msg: '[FILE_MANAGER_EXTENSION] Uninstallation failed',
        error,
      });
    });
  });
});
