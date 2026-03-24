import * as checkForUpdatesOnGithubModule from '../../../core/auto-update/check-for-updates-on-github';
import * as autoUpdateModule from 'electron-updater';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { checkForUpdates } from './check-for-updates';

vi.mock('electron-updater', () => ({
  autoUpdater: {
    checkForUpdatesAndNotify: vi.fn(),
    logger: null,
  },
}));

vi.mock('../../../core/auto-update/check-for-updates-on-github');

describe('checkForUpdates', () => {
  const checkForUpdatesOnGithubMock = partialSpyOn(checkForUpdatesOnGithubModule, 'checkForUpdatesOnGithub');
  const checkForUpdatesAndNotifyMock = partialSpyOn(autoUpdateModule.autoUpdater, 'checkForUpdatesAndNotify');

  const onUpdateAvailable = vi.fn();

  const defaultProps = {
    currentVersion: '2.5.3',
    onUpdateAvailable,
  };

  beforeEach(() => {
    delete process.env.APPIMAGE;
    onUpdateAvailable.mockClear();
  });

  describe('when running as .deb (no APPIMAGE env var)', () => {
    describe('when an update is available', () => {
      it('calls onUpdateAvailable with the update info', async () => {
        checkForUpdatesOnGithubMock.mockResolvedValue({ version: '3.0.0' });

        await checkForUpdates(defaultProps);

        expect(onUpdateAvailable).toHaveBeenCalledWith({ version: '3.0.0' });
      });
    });

    describe('when already up to date', () => {
      it('does not call onUpdateAvailable', async () => {
        checkForUpdatesOnGithubMock.mockResolvedValue(null);

        await checkForUpdates(defaultProps);

        expect(onUpdateAvailable).not.toHaveBeenCalled();
      });
    });

    it('does not call autoUpdater.checkForUpdatesAndNotify', async () => {
      checkForUpdatesOnGithubMock.mockResolvedValue(null);

      await checkForUpdates(defaultProps);

      expect(checkForUpdatesAndNotifyMock).not.toHaveBeenCalled();
    });
  });

  describe('when running as .AppImage', () => {
    beforeEach(() => {
      process.env.APPIMAGE = '/path/to/app.AppImage';
    });

    it('calls autoUpdater.checkForUpdatesAndNotify', async () => {
      await checkForUpdates(defaultProps);

      expect(checkForUpdatesAndNotifyMock).toHaveBeenCalled();
    });

    it('does not call checkForUpdatesOnGithub', async () => {
      await checkForUpdates(defaultProps);

      expect(checkForUpdatesOnGithubMock).not.toHaveBeenCalled();
    });

    it('does not call onUpdateAvailable', async () => {
      await checkForUpdates(defaultProps);

      expect(onUpdateAvailable).not.toHaveBeenCalled();
    });

    describe('when autoUpdater throws', () => {
      it('handles the error gracefully without throwing', async () => {
        checkForUpdatesAndNotifyMock.mockImplementation(() => {
          throw new Error('update error');
        });

        await expect(checkForUpdates(defaultProps)).resolves.toBeUndefined();
      });
    });
  });
});
