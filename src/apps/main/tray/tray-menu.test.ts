import PackageJson from '../../../../package.json';

const { trayHandlers, trayInstance, buildFromTemplateMock, createFromPathMock, TrayMock } = vi.hoisted(() => {
  const trayHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const trayInstance = {
    getBounds: vi.fn(() => ({ x: 1, y: 2, width: 3, height: 4 })),
    setIgnoreDoubleClickEvents: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      trayHandlers.set(event, handler);
    }),
    setContextMenu: vi.fn(),
    setImage: vi.fn(),
    setToolTip: vi.fn(),
    destroy: vi.fn(),
  };

  const buildFromTemplateMock = vi.fn((template) => ({ template }));
  const createFromPathMock = vi.fn((imagePath: string) => ({ imagePath }));
  const TrayMock = vi.fn(() => trayInstance);

  return {
    trayHandlers,
    trayInstance,
    buildFromTemplateMock,
    createFromPathMock,
    TrayMock,
  };
});

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: buildFromTemplateMock,
  },
  nativeImage: {
    createFromPath: createFromPathMock,
  },
  Tray: TrayMock,
}));

import { TrayMenu } from './tray-menu';

describe('tray-menu', () => {
  beforeEach(() => {
    trayHandlers.clear();
  });

  it('should initialize the tray in loading state', () => {
    // Given
    const onClick = vi.fn();
    const onQuit = vi.fn();

    // When
    new TrayMenu('/icons', onClick, onQuit);

    // Then
    expect(TrayMock).toBeCalledWith('/icons/loading.png');
    expect(trayInstance.setIgnoreDoubleClickEvents).toBeCalledWith(true);
    expect(createFromPathMock).toBeCalledWith('/icons/loading.png');
    expect(trayInstance.setImage).toBeCalledWith({ imagePath: '/icons/loading.png' });
    expect(trayInstance.setToolTip).toBeCalledWith('Loading Internxt...');
  });

  it('should invoke onClick and clear the context menu on tray click', async () => {
    // Given
    const onClick = vi.fn().mockResolvedValue(undefined);
    const onQuit = vi.fn();
    new TrayMenu('/icons', onClick, onQuit);

    // When
    await trayHandlers.get('click')?.();

    // Then
    expect(onClick).toBeCalled();
    expect(trayInstance.setContextMenu).toBeCalledWith(null);
  });

  it('should build and set the tray context menu', () => {
    // Given
    const onClick = vi.fn().mockResolvedValue(undefined);
    const onQuit = vi.fn();
    const trayMenu = new TrayMenu('/icons', onClick, onQuit);

    // When
    trayMenu.updateContextMenu();

    // Then
    expect(buildFromTemplateMock).toBeCalledWith([
      {
        label: 'Show/Hide',
        click: expect.any(Function),
      },
      {
        label: 'Quit',
        click: onQuit,
      },
    ]);
    expect(trayInstance.setContextMenu).toBeCalledWith({
      template: [
        {
          label: 'Show/Hide',
          click: expect.any(Function),
        },
        {
          label: 'Quit',
          click: onQuit,
        },
      ],
    });
  });

  it('should update the tooltip for idle state', () => {
    // Given
    const trayMenu = new TrayMenu('/icons', vi.fn().mockResolvedValue(undefined), vi.fn());

    // When
    trayMenu.setState('IDLE');

    // Then
    expect(trayInstance.setToolTip).toBeCalledWith(`Internxt ${PackageJson.version}`);
  });
});
