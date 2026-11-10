import { ClientCompatibilityState } from '@internxt/drive-desktop-core/build/backend';
import { getClientCompatibilityTexts } from '@internxt/drive-desktop-core/build/frontend/features/client-compatibility';
import { Notification } from 'electron';
import { getLanguage } from '../../../../apps/main/config/language';
import { updateApp } from './update-app';

/**
 * v2.7.1 Alexis Mora
 * Clicking the notification starts the update: a logged out user has no widget to show the banner in.
 */
export function showClientCompatibilityNotification({ state }: { state: ClientCompatibilityState }) {
  const texts = getClientCompatibilityTexts({ state, language: getLanguage() });
  if (!texts) return;

  const notification = new Notification({ title: texts.title, body: texts.description });
  notification.on('click', () => void updateApp());
  notification.show();
}
