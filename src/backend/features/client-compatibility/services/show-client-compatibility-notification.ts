import { ClientCompatibilityState } from '@internxt/drive-desktop-core/build/backend';
import { getClientCompatibilityTexts } from '@internxt/drive-desktop-core/build/frontend/features/client-compatibility';
import { Notification } from 'electron';
import { getLanguage } from '../../../../apps/main/config/language';
import { getIsLoggedIn } from '../../../../apps/main/auth/handlers';
import { getAuthWindow } from '../../../../apps/main/windows/auth';
import { showClientCompatibilityWidget } from './show-client-compatibility-widget';

/**
 * v2.7.1 Alexis Mora
 * Clicking the notification opens the widget with the update banner, or the login window when logged out.
 */
export function showClientCompatibilityNotification({ state }: { state: ClientCompatibilityState }) {
  const texts = getClientCompatibilityTexts({ state, language: getLanguage() });
  if (!texts) return;

  const notification = new Notification({ title: texts.title, body: texts.description });
  notification.on('click', () => {
    if (getIsLoggedIn()) void showClientCompatibilityWidget();
    else getAuthWindow()?.show();
  });
  notification.show();
}
