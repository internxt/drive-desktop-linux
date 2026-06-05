import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Notification, shell } from 'electron';
import { getNotifications } from '../../../../infra/drive-server/services/notifications/get-notifications';
import { showMarketingNotifications } from './show-marketing-notifications';

vi.mock('../../../../infra/drive-server/services/notifications/get-notifications', () => ({
  getNotifications: vi.fn(),
}));

const { notificationInstances } = vi.hoisted(() => ({
  notificationInstances: [] as Array<{
    options: Electron.NotificationConstructorOptions;
    on: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/internxt-test'),
    isPackaged: false,
  },
  Notification: Object.assign(
    vi.fn((options: Electron.NotificationConstructorOptions) => {
      const instance = {
        options,
        on: vi.fn(),
        show: vi.fn(),
      };
      notificationInstances.push(instance);
      return instance;
    }),
    {
      isSupported: vi.fn(() => true),
    },
  ),
  shell: {
    openExternal: vi.fn(),
  },
}));

describe('showMarketingNotifications', () => {
  const getNotificationsMock = vi.mocked(getNotifications);
  const NotificationMock = vi.mocked(Notification);
  const isSupportedMock = vi.mocked(Notification.isSupported);
  const openExternalMock = vi.mocked(shell.openExternal);

  beforeEach(() => {
    notificationInstances.length = 0;
    isSupportedMock.mockReturnValue(true);
  });

  it('should show one native notification for each marketing notification', async () => {
    getNotificationsMock.mockResolvedValue({
      data: [
        {
          id: 'first-notification',
          link: 'https://internxt.com/first',
          message: 'First message',
          expiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          isRead: false,
          deliveredAt: '2024-01-01T00:00:00.000Z',
          readAt: null,
        },
        {
          id: 'second-notification',
          link: 'https://internxt.com/second',
          message: 'Second message',
          expiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          isRead: false,
          deliveredAt: '2024-01-01T00:00:00.000Z',
          readAt: null,
        },
      ],
    });

    await showMarketingNotifications();

    expect(NotificationMock).toHaveBeenCalledTimes(2);
    expect(notificationInstances[0].options).toMatchObject({
      title: 'Internxt Drive',
      body: 'First message',
      icon: expect.stringContaining('icons/256x256.png'),
    });
    expect(notificationInstances[1].options.body).toBe('Second message');
    expect(notificationInstances[0].show).toHaveBeenCalledOnce();
    expect(notificationInstances[1].show).toHaveBeenCalledOnce();
  });

  it('should open the notification link when the native notification is clicked', async () => {
    getNotificationsMock.mockResolvedValue({
      data: [
        {
          id: 'notification-id',
          link: 'https://internxt.com/promo',
          message: 'Promo message',
          expiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          isRead: false,
          deliveredAt: '2024-01-01T00:00:00.000Z',
          readAt: null,
        },
      ],
    });

    await showMarketingNotifications();
    const clickHandler = notificationInstances[0].on.mock.calls.find(([event]) => event === 'click')?.[1];
    await clickHandler();

    expect(openExternalMock).toHaveBeenCalledWith('https://internxt.com/promo');
  });

  it('should not open non-https notification links', async () => {
    getNotificationsMock.mockResolvedValue({
      data: [
        {
          id: 'notification-id',
          link: 'internxt://notification/promo',
          message: 'Promo message',
          expiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          isRead: false,
          deliveredAt: '2024-01-01T00:00:00.000Z',
          readAt: null,
        },
      ],
    });

    await showMarketingNotifications();
    const clickHandler = notificationInstances[0].on.mock.calls.find(([event]) => event === 'click')?.[1];
    await clickHandler();

    expect(openExternalMock).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Error opening marketing notification link',
        link: 'internxt://notification/promo',
      }),
    );
  });

  it('should log native notification failures', async () => {
    getNotificationsMock.mockResolvedValue({
      data: [
        {
          id: 'notification-id',
          link: 'https://internxt.com/promo',
          message: 'Promo message',
          expiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          isRead: false,
          deliveredAt: '2024-01-01T00:00:00.000Z',
          readAt: null,
        },
      ],
    });
    const error = new Error('Notification failed');

    await showMarketingNotifications();
    const failedHandler = notificationInstances[0].on.mock.calls.find(([event]) => event === 'failed')?.[1];
    failedHandler(error);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Marketing notification failed',
        error,
      }),
    );
  });

  it('should not create native notifications when they are not supported', async () => {
    isSupportedMock.mockReturnValue(false);
    getNotificationsMock.mockResolvedValue({
      data: [
        {
          id: 'notification-id',
          link: 'https://internxt.com/promo',
          message: 'Promo message',
          expiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          isRead: false,
          deliveredAt: '2024-01-01T00:00:00.000Z',
          readAt: null,
        },
      ],
    });

    await showMarketingNotifications();

    expect(NotificationMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith({ msg: 'Native notifications are not supported' });
  });

  it('should log when fetching marketing notifications fails', async () => {
    const error = new Error('Request failed');
    getNotificationsMock.mockResolvedValue({ error });

    await showMarketingNotifications();

    expect(logger.error).toHaveBeenCalledWith({ msg: 'Error showing marketing notifications', error });
  });
});
