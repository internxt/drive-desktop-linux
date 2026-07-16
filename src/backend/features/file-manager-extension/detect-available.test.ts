import { detectAvailableFileManager, isNautilusAvailable, isNemoAvailable } from './detect-available';

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
};

function mockExecWith({ desktopEntry, hasNautilus = false, hasNemo = false }: Props) {
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

    it('should fallback to nemo if only nemo binary is available', async () => {
      mockExecWith({
        hasNemo: true,
      });

      const result = await detectAvailableFileManager();
      expect(result).toBe('nemo');
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

  describe('isNemoAvailable', () => {
    it('should return true when nemo is available', async () => {
      mockExecWith({
        desktopEntry: 'nemo.desktop',
        hasNemo: true,
      });

      const result = await isNemoAvailable();
      expect(result).toBe(true);
    });

    it('should return false when nemo is not available', async () => {
      mockExecWith({});

      const result = await isNemoAvailable();
      expect(result).toBe(false);
    });
  });
});
