import { registerEventBusBackupHandlers } from './register-event-bus-backup-handlers';
import eventBus from '../../../../apps/main/event-bus';
import { backupManager } from '..';
import * as startBackupsIfAvailableModule from '../start-backups-if-available';
import type { UserAvailableProducts } from '@internxt/drive-desktop-core/build/backend';
import { calls, call, partialSpyOn } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';

describe('registerEventBusBackupHandlers', () => {
  const stopAndClearBackupsMock = partialSpyOn(backupManager, 'stopAndClearBackups');
  const startBackupsIfAvailableMock = partialSpyOn(startBackupsIfAvailableModule, 'startBackupsIfAvailable');

  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  it('should register the event bus USER_LOGGED_OUT handler', () => {
    registerEventBusBackupHandlers();

    expect(eventBus.listenerCount('USER_LOGGED_OUT')).toBe(1);
  });

  it('should register the event bus USER_AVAILABLE_PRODUCTS_UPDATED handler', () => {
    registerEventBusBackupHandlers();

    expect(eventBus.listenerCount('USER_AVAILABLE_PRODUCTS_UPDATED')).toBe(1);
  });

  describe('USER_LOGGED_OUT event', () => {
    it('should call stopAndClearBackups when USER_LOGGED_OUT is emitted', () => {
      registerEventBusBackupHandlers();

      eventBus.emit('USER_LOGGED_OUT');

      calls(stopAndClearBackupsMock).toHaveLength(1);
    });
  });

  describe('USER_AVAILABLE_PRODUCTS_UPDATED event', () => {
    const mockProductsWithBackups: UserAvailableProducts = {
      antivirus: false,
      backups: true,
      cleaner: false,
    };

    const mockProductsWithoutBackups: UserAvailableProducts = {
      antivirus: false,
      backups: false,
      cleaner: false,
    };

    it('should call startBackupsIfAvailable when products have backups enabled', () => {
      registerEventBusBackupHandlers();

      eventBus.emit('USER_AVAILABLE_PRODUCTS_UPDATED', mockProductsWithBackups);

      call(loggerMock.debug).toMatchObject({
        msg: 'User has the backup feature available, starting backups',
      });
      calls(startBackupsIfAvailableMock).toHaveLength(1);
    });

    it('should call stopAndClearBackups when products have backups disabled', () => {
      registerEventBusBackupHandlers();

      eventBus.emit('USER_AVAILABLE_PRODUCTS_UPDATED', mockProductsWithoutBackups);

      call(loggerMock.debug).toMatchObject({
        msg: 'User does not have the backup feature available',
      });
      calls(stopAndClearBackupsMock).toHaveLength(1);
    });
  });
});
