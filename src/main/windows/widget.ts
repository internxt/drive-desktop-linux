import { BrowserWindow, screen } from 'electron';

import { isAutoLaunchEnabled } from '../auto-launch/service';
import eventBus from '../event-bus';
import { TrayMenu } from '../tray';
import { preloadPath, resolveHtmlPath } from '../util';
import { setUpCommonWindowHandlers } from '.';
import { getIsLoggedIn } from '../auth/handlers';

const widgetConfig: { width: number; height: number; placeUnderTray: boolean } =
  { width: 330, height: 392, placeUnderTray: true };
let widget: BrowserWindow | null = null;
export const getWidget = () => (widget?.isDestroyed() ? null : widget);

export const createWidget = async () => {
  widget = new BrowserWindow({
    width: widgetConfig.width,
    height: widgetConfig.height,
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: true,
    },
    movable: false,
    frame: false,
    resizable: false,
    maximizable: false,
    skipTaskbar: true,
  });

  const widgetLoaded = widget.loadURL(resolveHtmlPath(''));

  widget.on('ready-to-show', () => {
    if (isAutoLaunchEnabled()) {
      return;
    }
    widget?.show();
  });

  widget.on('blur', () => {
    const isLoggedIn = getIsLoggedIn();

    if (!isLoggedIn) {
      return;
    }

    widget?.hide();
  });

  setUpCommonWindowHandlers(widget);

  widget.on('closed', () => {
    widget = null;
  });
  widget.webContents.on('ipc-message', (_, channel, payload) => {
    // Current widget pathname
    if (channel === 'path-changed') {
      console.log('Renderer navigated to ', payload);
    }
  });

  await widgetLoaded;
  eventBus.emit('WIDGET_IS_READY');
};

export function toggleWidgetVisibility() {
  if (!widget) {
    return;
  }

  if (widget.isVisible()) {
    widget.hide();
  } else {
    widget.show();
  }
}

function getLocationUnderTray(
  { width, height }: { width: number; height: number },
  bounds: Electron.Rectangle
): { x: number; y: number } {
  const display = screen.getDisplayMatching(bounds);
  let x = Math.min(
    bounds.x - display.workArea.x - width / 2,
    display.workArea.width - width
  );
  x += display.workArea.x;
  x = Math.max(display.workArea.x, x);
  let y = Math.min(
    bounds.y - display.workArea.y - height / 2,
    display.workArea.height - height
  );
  y += display.workArea.y;
  y = Math.max(display.workArea.y, y);

  return {
    x,
    y,
  };
}

export function setBoundsOfWidgetByPath(
  widgetWindow: BrowserWindow,
  tray: TrayMenu
) {
  const { placeUnderTray, ...size } = widgetConfig;

  const bounds = tray.bounds;

  if (placeUnderTray && bounds) {
    const location = getLocationUnderTray(size, bounds);
    widgetWindow.setBounds({ ...size, ...location });
  } else {
    widgetWindow.center();
    widgetWindow.setBounds(size);
  }
}
