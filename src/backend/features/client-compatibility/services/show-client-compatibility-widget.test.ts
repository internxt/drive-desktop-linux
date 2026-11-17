const { hideMock, showMock, getOrCreateWidgedMock, setBoundsOfWidgetByPathMock, getTrayMock } = vi.hoisted(() => ({
  hideMock: vi.fn(),
  showMock: vi.fn(),
  getOrCreateWidgedMock: vi.fn(),
  setBoundsOfWidgetByPathMock: vi.fn(),
  getTrayMock: vi.fn(),
}));

vi.mock('../../../../apps/main/windows/auth', () => ({ getAuthWindow: () => ({ hide: hideMock }) }));
vi.mock('../../../../apps/main/windows/widget', () => ({
  getOrCreateWidged: getOrCreateWidgedMock,
  setBoundsOfWidgetByPath: setBoundsOfWidgetByPathMock,
}));
vi.mock('../../../../apps/main/tray/tray-setup', () => ({ getTray: getTrayMock }));

import { showClientCompatibilityWidget } from './show-client-compatibility-widget';

describe('show-client-compatibility-widget', () => {
  it('should swap the login window for the widget placed under the tray', async () => {
    // Given
    const widget = { show: showMock };
    const tray = { id: 'tray' };
    getOrCreateWidgedMock.mockResolvedValue(widget);
    getTrayMock.mockReturnValue(tray);
    // When
    await showClientCompatibilityWidget();
    // Then
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(setBoundsOfWidgetByPathMock).toHaveBeenCalledWith(widget, tray);
    expect(showMock).toHaveBeenCalledTimes(1);
  });

  it('should do nothing else when the widget cannot be created', async () => {
    // Given
    getOrCreateWidgedMock.mockResolvedValue(null);
    // When
    await showClientCompatibilityWidget();
    // Then
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(setBoundsOfWidgetByPathMock).not.toHaveBeenCalled();
  });
});
