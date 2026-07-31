import {
  detectAvailableFileManager,
  isNautilusAvailable,
} from './detect-available';

const { execAsyncMock } = vi.hoisted(() => ({
  execAsyncMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: vi.fn(() => execAsyncMock),
}));

type ExecAsyncResult = {
  stdout: string;
  stderr: string;
};

type Props = {
  desktopEntry?: string;
  hasNautilus?: boolean;
  hasNemo?: boolean;
  hasDolphin?: boolean;
};

function mockExecWith({ desktopEntry, hasNautilus = false, hasNemo = false, hasDolphin = false }: Props) {
  execAsyncMock.mockImplementation(async (command: string) => {
    if (command === 'xdg-mime query default inode/directory') {
      if (!desktopEntry) throw new Error('not found');
      return {
        stdout: `${desktopEntry}\n`,
        stderr: '',
      } as ExecAsyncResult;
    }

    if (command === 'command -v nautilus') {
      if (hasNautilus) {
        return {
          stdout: '/usr/bin/nautilus\n',
          stderr: '',
        } as ExecAsyncResult;
      } else {
        throw new Error('nautilus not found');
      }
    }

    if (command === 'command -v nemo') {
      if (hasNemo) {
        return {
          stdout: '/usr/bin/nemo\n',
          stderr: '',
        } as ExecAsyncResult;
      } else {
        throw new Error('nemo not found');
      }
    }

    if (command === 'command -v dolphin') {
      if (hasDolphin) {
        return {
          stdout: '/usr/bin/dolphin\n',
          stderr: '',
        } as ExecAsyncResult;
      } else {
        throw new Error('dolphin not found');
      }
    }

    throw new Error(`Unexpected command: ${command}`);
  });
}

describe('detect-available', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectAvailableFileManager', () => {
    it('should detect nautilus when it is the default directory manager', async () => {
      mockExecWith({
        desktopEntry: 'org.gnome.Nautilus.desktop',
        hasNautilus: true,
      });

      const result = await detectAvailableFileManager();
      expect(result).toBe('nautilus');
    });

    it('should detect nemo when it is the default directory manager', async () => {
      mockExecWith({
        desktopEntry: 'nemo.desktop',
        hasNemo: true,
      });

      const result = await detectAvailableFileManager();
      expect(result).toBe('nemo');
    });

    it('should detect dolphin when it is the default directory manager', async () => {
      mockExecWith({
        desktopEntry: 'org.kde.dolphin.desktop',
        hasDolphin: true,
      });

      const result = await detectAvailableFileManager();
      expect(result).toBe('dolphin');
    });

    it('should fallback to nemo if only nemo binary is available', async () => {
      mockExecWith({
        hasNemo: true,
      });

      const result = await detectAvailableFileManager();
      expect(result).toBe('nemo');
    });

    it('should fallback to dolphin if only dolphin binary is available', async () => {
      mockExecWith({
        hasDolphin: true,
      });

      const result = await detectAvailableFileManager();
      expect(result).toBe('dolphin');
    });

    it('should return null when no file manager is available', async () => {
      mockExecWith({});

      const result = await detectAvailableFileManager();
      expect(result).toBeNull();
    });
  });

  describe('isNautilusAvailable', () => {
    it('should return true when nautilus is available', async () => {
      mockExecWith({
        desktopEntry: 'org.gnome.Nautilus.desktop',
        hasNautilus: true,
      });

      const result = await isNautilusAvailable();
      expect(result).toBe(true);
    });

    it('should return false when nautilus is not available', async () => {
      mockExecWith({});

      const result = await isNautilusAvailable();
      expect(result).toBe(false);
    });
  });
});
