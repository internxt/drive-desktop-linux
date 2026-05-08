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

  it('should initialize the tray with context menu in loading state', () => {
    // Given
    const onClick = vi.fn();
    const onQuit = vi.fn();

    // When
    new TrayMenu('/icons', onClick, onQuit);

    // Then
    expect(TrayMock).toBeCalledWith('/icons/loading.png');
    expect(createFromPathMock).toBeCalledWith('/icons/loading.png');
    expect(trayInstance.setImage).toBeCalledWith({ imagePath: '/icons/loading.png' });
    expect(trayInstance.setToolTip).toBeCalledWith('Loading Internxt...');
    expect(buildFromTemplateMock).toBeCalledWith([{ label: 'Open app', click: expect.any(Function) }]);
    expect(trayInstance.setContextMenu).toBeCalledWith({ template: [{ label: 'Open app', click: expect.any(Function) }] });
  });

  it('should invoke onClick when the context menu Open app item is clicked', async () => {
    // Given
    const onClick = vi.fn().mockResolvedValue(undefined);
    const onQuit = vi.fn();
    new TrayMenu('/icons', onClick, onQuit);

    // When – simulate clicking the first (only) menu item
    const [[menuTemplate]] = buildFromTemplateMock.mock.calls as [[Electron.MenuItemConstructorOptions[]]];
    await (menuTemplate[0].click as () => Promise<void>)();

    // Then
    expect(onClick).toBeCalled();
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
