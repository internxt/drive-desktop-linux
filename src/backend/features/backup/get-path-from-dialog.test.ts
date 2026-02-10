import { BrowserWindow, dialog } from 'electron';
import { call } from 'tests/vitest/utils.helper';
import { getPathFromDialog } from './get-path-from-dialog';
import path from 'node:path';

const mockWindow = {
  hide: vi.fn(),
  show: vi.fn(),
  isVisible: vi.fn().mockReturnValue(true),
  isDestroyed: vi.fn().mockReturnValue(false),
};

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn(),
    getAllWindows: vi.fn(),
  },
}));

describe('getPathFromDialog', () => {
  const mockedDialog = vi.mocked(dialog.showOpenDialog);
  const mockedGetFocusedWindow = vi.mocked(BrowserWindow.getFocusedWindow);
  const mockedGetAllWindows = vi.mocked(BrowserWindow.getAllWindows);

  beforeEach(() => {
    mockedGetFocusedWindow.mockReturnValue(mockWindow as unknown as BrowserWindow);
    mockedGetAllWindows.mockReturnValue([mockWindow] as unknown as BrowserWindow[]);
  });

  it('should hide the focused window before opening the dialog', async () => {
    mockedDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await getPathFromDialog();

    expect(mockWindow.hide).toHaveBeenCalled();
  });

  it('should show the window after the dialog closes', async () => {
    mockedDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await getPathFromDialog();

    expect(mockWindow.show).toHaveBeenCalled();
  });

  it('should not show the window if it was destroyed', async () => {
    mockWindow.isDestroyed.mockReturnValue(true);
    mockedDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await getPathFromDialog();

    expect(mockWindow.show).not.toHaveBeenCalled();
  });

  it('should use a visible window when no focused window exists', async () => {
    mockedGetFocusedWindow.mockReturnValue(null);

    mockedDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await getPathFromDialog();

    expect(mockWindow.hide).toHaveBeenCalled();
  });

  it('should return null when the dialog is canceled', async () => {
    mockedDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    const result = await getPathFromDialog();

    expect(result).toBe(null);
  });

  it('should return the path with a trailing separator and the item name', async () => {
    mockedDialog.mockResolvedValue({ canceled: false, filePaths: ['/home/user/Documents'] });

    const result = await getPathFromDialog();

    expect(result).toStrictEqual({
      path: `/home/user/Documents${path.sep}`,
      itemName: 'Documents',
    });
  });

  it('should not duplicate the separator if the path already ends with one', async () => {
    mockedDialog.mockResolvedValue({ canceled: false, filePaths: [`/home/user/Documents${path.sep}`] });

    const result = await getPathFromDialog();

    expect(result).toStrictEqual({
      path: `/home/user/Documents${path.sep}`,
      itemName: 'Documents',
    });
  });

  it('should open the dialog with openDirectory property', async () => {
    mockedDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await getPathFromDialog();

    call(mockedDialog).toMatchObject({ properties: ['openDirectory'] });
  });

  it('should skip hide and show and still return the selected path when no BackupFolderSelector window exists', async () => {
    mockedGetFocusedWindow.mockReturnValue(null);
    mockedGetAllWindows.mockReturnValue([]);

    mockedDialog.mockResolvedValue({ canceled: false, filePaths: ['/home/user/folder'] });

    const result = await getPathFromDialog();

    expect(mockWindow.hide).not.toHaveBeenCalled();
    expect(mockWindow.show).not.toHaveBeenCalled();
    expect(result).toStrictEqual({
      path: `/home/user/folder${path.sep}`,
      itemName: 'folder',
    });
  });
});
