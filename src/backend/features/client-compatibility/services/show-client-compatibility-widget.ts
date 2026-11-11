import { getAuthWindow } from '../../../../apps/main/windows/auth';
import { getOrCreateWidged, setBoundsOfWidgetByPath } from '../../../../apps/main/windows/widget';
import { getTray } from '../../../../apps/main/tray/tray-setup';

/**
 * v2.7.1 Alexis Mora
 * A logged in user on an unsupported version skips USER_LOGGED_IN, whose handler would normally swap the login
 * window for the widget. We do that part here so the widget shows the update banner, without starting any feature.
 */
export async function showClientCompatibilityWidget() {
  getAuthWindow()?.hide();

  const widget = await getOrCreateWidged();
  const tray = getTray();
  if (!widget) return;

  if (tray) setBoundsOfWidgetByPath(widget, tray);
  widget.show();
}
