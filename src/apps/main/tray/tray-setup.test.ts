import { call, calls } from 'tests/vitest/utils.helper';

const {
  mockApp,
  mockGetIsLoggedIn,
  mockGetOrCreateWidged,
  mockSetBoundsOfWidgetByPath,
  mockToggleWidgetVisibility,
  mockShowAuthWindow,
  mockGetAuthWindow,
  trayMenuInstance,
  TrayMenuMock,
} = vi.hoisted(() => {
  const mockApp = {
    isPackaged: false,
    quit: vi.fn(),
  };

  const mockGetIsLoggedIn = vi.fn();
  const mockGetOrCreateWidged = vi.fn();
  const mockSetBoundsOfWidgetByPath = vi.fn();
  const mockToggleWidgetVisibility = vi.fn();
  const mockShowAuthWindow = vi.fn();
  const mockGetAuthWindow = vi.fn(() => ({ show: mockShowAuthWindow }));

  const trayMenuInstance = {
    setState: vi.fn(),
    bounds: { x: 1, y: 2, width: 3, height: 4 },
  };

  const TrayMenuMock = vi.fn(() => trayMenuInstance);

  return {
    mockApp,
    mockGetIsLoggedIn,
    mockGetOrCreateWidged,
    mockSetBoundsOfWidgetByPath,
    mockToggleWidgetVisibility,
    mockShowAuthWindow,
    mockGetAuthWindow,
    trayMenuInstance,
    TrayMenuMock,
  };
});

vi.mock('./tray-menu', () => ({
  TrayMenu: TrayMenuMock,
}));

vi.mock('../windows/widget', () => ({
  getOrCreateWidged: mockGetOrCreateWidged,
  setBoundsOfWidgetByPath: mockSetBoundsOfWidgetByPath,
  toggleWidgetVisibility: mockToggleWidgetVisibility,
}));

vi.mock('../auth/handlers', () => ({
  getIsLoggedIn: mockGetIsLoggedIn,
}));

vi.mock('../windows/auth', () => ({
  getAuthWindow: mockGetAuthWindow,
}));

describe('tray-setup', () => {
  beforeEach(() => {
    vi.resetModules();
    mockApp.isPackaged = false;
    mockGetAuthWindow.mockReturnValue({ show: mockShowAuthWindow });
  });

  async function importTraySetup() {
    return import('./tray-setup');
  }

  function getTrayClickHandler() {
    const firstCall = TrayMenuMock.mock.calls[0] as unknown[] | undefined;

    if (!firstCall) {
      throw new Error('TrayMenu was not created');
    }

    const onClick = firstCall[1];

    if (typeof onClick !== 'function') {
      throw new Error('TrayMenu onClick handler was not registered');
    }

    return onClick as () => Promise<void>;
  }

  it('should create the tray only once', async () => {
    // Given
    const traySetup = await importTraySetup();

    // When
    const firstTray = traySetup.setupTrayIcon();
    const secondTray = traySetup.setupTrayIcon();

    // Then
    calls(TrayMenuMock).toHaveLength(1);
    expect(secondTray).toBe(firstTray);
    expect(traySetup.getTray()).toBe(firstTray);
  });

  it('should update tray status through the singleton instance', async () => {
    // Given
    const traySetup = await importTraySetup();
    traySetup.setupTrayIcon();

    // When
    traySetup.setTrayStatus('SYNCING');

    // Then
    call(trayMenuInstance.setState).toBe('SYNCING');
  });

  it('should show auth window when clicking the tray while logged out', async () => {
    // Given
    mockGetIsLoggedIn.mockReturnValue(false);
    const traySetup = await importTraySetup();
    traySetup.setupTrayIcon();
    const onClick = getTrayClickHandler();

    // When
    await onClick();

    // Then
    calls(mockShowAuthWindow).toHaveLength(1);
    calls(mockGetOrCreateWidged).toHaveLength(0);
    calls(mockToggleWidgetVisibility).toHaveLength(0);
  });

  it('should align and toggle the widget when clicking the tray while logged in', async () => {
    // Given
    const widgetWindow = { id: 'widget' };
    mockGetIsLoggedIn.mockReturnValue(true);
    mockGetOrCreateWidged.mockResolvedValue(widgetWindow);
    const traySetup = await importTraySetup();
    const tray = traySetup.setupTrayIcon();
    const onClick = getTrayClickHandler();

    // When
    await onClick();

    // Then
    call(mockSetBoundsOfWidgetByPath).toStrictEqual([widgetWindow, tray]);
    calls(mockToggleWidgetVisibility).toHaveLength(1);
  });
});