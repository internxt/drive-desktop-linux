import { logger } from '@internxt/drive-desktop-core/build/backend';
import configStore from '../../../apps/main/config';
import * as detectModule from './detect-available';
import * as serviceModule from './service';
import { LATEST_EXTENSION_VERSION } from './version';
import { call, calls, partialSpyOn } from 'tests/vitest/utils.helper';
import { installFileManagerExtension, uninstallFileManagerExtension } from './install';

describe('install', () => {
  const detectAvailableFileManagerMock = partialSpyOn(detectModule, 'detectAvailableFileManager');
  const getFileManagerTypeMock = partialSpyOn(serviceModule, 'getFileManagerType');
  const isInstalledMock = partialSpyOn(serviceModule, 'isInstalled');
  const copyExtensionFileMock = partialSpyOn(serviceModule, 'copyExtensionFile');
  const deleteExtensionFileMock = partialSpyOn(serviceModule, 'deleteExtensionFile');
  const reloadFileManagerMock = partialSpyOn(serviceModule, 'reloadFileManager');
  const configGetMock = partialSpyOn(configStore, 'get');
  const configSetMock = partialSpyOn(configStore, 'set');
  const loggerDebugMock = partialSpyOn(logger, 'debug');
  const loggerErrorMock = partialSpyOn(logger, 'error');

  beforeEach(() => {
    process.env.NODE_ENV = 'development';

    detectAvailableFileManagerMock.mockResolvedValue('nautilus');
    getFileManagerTypeMock.mockResolvedValue('nautilus');
    isInstalledMock.mockResolvedValue(false);
    copyExtensionFileMock.mockResolvedValue(undefined);
    deleteExtensionFileMock.mockResolvedValue(undefined);
    reloadFileManagerMock.mockResolvedValue(undefined);
    configGetMock.mockReturnValue(0);
  });

  describe('installFileManagerExtension', () => {
    it('should skip installation when no file manager is available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce(null);

      // When
      await installFileManagerExtension();

      // Then
      calls(isInstalledMock).toHaveLength(0);
      calls(copyExtensionFileMock).toHaveLength(0);
      calls(deleteExtensionFileMock).toHaveLength(0);
      calls(configSetMock).toHaveLength(0);
      calls(reloadFileManagerMock).toHaveLength(0);
    });

    it('should install and reload when extension is not installed', async () => {
      // Given
      isInstalledMock.mockResolvedValueOnce(false);

      // When
      await installFileManagerExtension();

      // Then
      call(copyExtensionFileMock).toStrictEqual([]);
      call(configSetMock).toStrictEqual(['fileManagerExtensionVersion', LATEST_EXTENSION_VERSION]);
      call(reloadFileManagerMock).toStrictEqual([]);
      calls(deleteExtensionFileMock).toHaveLength(0);
      calls(loggerErrorMock).toHaveLength(0);
    });

    it('should log reload error and continue when reload fails after install', async () => {
      // Given
      const reloadError = new Error('reload failed');
      reloadFileManagerMock.mockRejectedValueOnce(reloadError);

      // When
      await installFileManagerExtension();

      // Then
      call(loggerErrorMock).toMatchObject({
        msg: 'Caught error while reloading file manager extension',
        error: reloadError,
      });
    });

    it('should replace installed extension when there is a newer version', async () => {
      // Given
      process.env.NODE_ENV = 'production';
      isInstalledMock.mockResolvedValueOnce(true);
      configGetMock.mockReturnValueOnce(0);

      // When
      await installFileManagerExtension();

      // Then
      call(deleteExtensionFileMock).toStrictEqual([]);
      call(copyExtensionFileMock).toStrictEqual([]);
      call(configSetMock).toStrictEqual(['fileManagerExtensionVersion', LATEST_EXTENSION_VERSION]);
      call(reloadFileManagerMock).toStrictEqual([]);
    });

    it('should skip installation when extension is already up to date', async () => {
      // Given
      process.env.NODE_ENV = 'production';
      isInstalledMock.mockResolvedValueOnce(true);
      configGetMock.mockReturnValueOnce(LATEST_EXTENSION_VERSION);

      // When
      await installFileManagerExtension();

      // Then
      calls(copyExtensionFileMock).toHaveLength(0);
      calls(deleteExtensionFileMock).toHaveLength(0);
      calls(reloadFileManagerMock).toHaveLength(0);
    });

    it('should detect nemo when available', async () => {
      // Given
      detectAvailableFileManagerMock.mockResolvedValueOnce('nemo');
      getFileManagerTypeMock.mockResolvedValueOnce('nemo');
      isInstalledMock.mockResolvedValueOnce(false);

      // When
      await installFileManagerExtension();

      // Then
      call(configSetMock).toStrictEqual(['fileManagerExtensionVersion', LATEST_EXTENSION_VERSION]);
      // Verify logger was called with nemo
      calls(loggerDebugMock).toMatchObject(
        expect.arrayContaining([expect.objectContaining({ msg: expect.stringContaining('nemo') })]),
      );
    });
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
