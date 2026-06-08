import { dialog } from 'electron';
import configStore from '../config';
import eventBus from '../event-bus';
import { chooseSyncRootWithDialog, getRootVirtualDrive } from './service';

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
  shell: {
    openPath: vi.fn(),
  },
}));

vi.mock('../../../core/electron/paths', () => ({
  PATHS: {
    ROOT_DRIVE_FOLDER: '/home/user/Internxt Drive',
  },
}));

vi.mock('../config', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../event-bus', () => ({
  default: {
    emit: vi.fn(),
  },
}));

vi.mock('../../shared/fs/ensure-folder-exists', () => ({
  ensureFolderExists: vi.fn(),
}));

describe('service', () => {
  const configGetMock = vi.mocked(configStore.get);
  const configSetMock = vi.mocked(configStore.set);
  const eventBusEmitMock = vi.mocked(eventBus.emit);

  beforeEach(() => {
    const state: Record<string, string> = {
      virtualDriveRoot: '',
      lastSavedListing: '',
    };

    configGetMock.mockImplementation((key) => state[key]);
    configSetMock.mockImplementation((key, value) => {
      state[key] = value;
    });
  });

  it('should fallback to default root folder when no saved path exists', () => {
    const state: Record<string, string> = {
      virtualDriveRoot: '',
      lastSavedListing: '',
    };

    configGetMock.mockImplementation((key) => {
      return state[key];
    });
    configSetMock.mockImplementation((key, value) => {
      state[key] = value;
    });

    const rootPath = getRootVirtualDrive();

    expect(rootPath).toBe('/home/user/Internxt Drive/');
    expect(configSetMock).toHaveBeenCalledWith('virtualDriveRoot', '/home/user/');
  });

  it('should emit SYNC_ROOT_CHANGED with old and new paths when user picks a different folder', async () => {
    const state: Record<string, string> = {
      virtualDriveRoot: '/old/root/',
      lastSavedListing: '',
    };

    configGetMock.mockImplementation((key) => state[key]);
    configSetMock.mockImplementation((key, value) => {
      state[key] = value;
    });

    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['/new/root'],
    } as Awaited<ReturnType<typeof dialog.showOpenDialog>>);

    const selectedPath = await chooseSyncRootWithDialog();

    expect(selectedPath).toBe('/new/root/Internxt Drive/');
    expect(eventBusEmitMock).toHaveBeenCalledWith('SYNC_ROOT_CHANGED', {
      oldPath: '/old/root/Internxt Drive/',
      newPath: '/new/root/Internxt Drive/',
    });
  });
});
