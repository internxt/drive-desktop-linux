import path from 'node:path';
import { Notification, shell } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { foldResult } from '../../../../context/shared/domain/Result';
import { PATHS } from '../../../../core/electron/paths';
import { getNotifications } from '../../../../infra/drive-server/services/notifications/get-notifications';
import type { UserNotification } from '../../../../infra/drive-server/out/dto';

const NOTIFICATION_ICON_PATH = path.join(PATHS.RESOURCES_PATH, 'icons', '256x256.png');

export async function showMarketingNotifications() {
  const result = await getNotifications();

  foldResult(result, {
    data: showNotifications,
    error: (error) => logger.error({ msg: 'Error showing marketing notifications', error }),
  });
}

function showNotifications(notifications: Array<UserNotification>) {
  if (!Notification.isSupported()) {
    logger.warn({ msg: 'Native notifications are not supported' });
    return;
  }

  for (const notification of notifications) {
    const popup = new Notification({
      title: 'Internxt Drive',
      body: notification.message,
      icon: NOTIFICATION_ICON_PATH,
    });

    popup.on('click', async () => {
      try {
        await openNotificationLink(notification.link);
      } catch (error) {
        logger.error({ msg: 'Error opening marketing notification link', link: notification.link, error });
      }
    });

    popup.on('failed', (error) => {
      logger.error({ msg: 'Marketing notification failed', notification, error });
    });

    popup.show();
  }
}

async function openNotificationLink(link: string): Promise<void> {
  const url = new URL(link);

  if (url.protocol !== 'https:') {
    throw new Error('Unsupported marketing notification link protocol: ' + url.protocol);
  }

  await shell.openExternal(url.toString());
}
