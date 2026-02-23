import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerEventBusBackupHandlers } from './register-event-bus-backup-handlers';
import eventBus from '../../../../apps/main/event-bus';
import { backupManager } from '..';
import { startBackupsIfAvailable } from '../start-backups-if-available';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { UserAvailableProducts } from '@internxt/drive-desktop-core/build/backend';

vi.mock('..', () => ({
  backupManager: {
    stopAndClearBackups: vi.fn(),
  },
}));

vi.mock('../start-backups-if-available', () => ({
  startBackupsIfAvailable: vi.fn(),
}));

vi.mock('@internxt/drive-desktop-core/build/backend', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('registerEventBusBackupHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
  });

  it('should register the event bus USER_LOGGED_OUT handler', () => {
    registerEventBusBackupHandlers();

    expect(eventBus.listenerCount('USER_LOGGED_OUT')).toBe(1);
  });

  it('should register the event bus USER_WAS_UNAUTHORIZED handler', () => {
    registerEventBusBackupHandlers();

    expect(eventBus.listenerCount('USER_WAS_UNAUTHORIZED')).toBe(1);
  });

  it('should register the event bus USER_AVAILABLE_PRODUCTS_UPDATED handler', () => {
    registerEventBusBackupHandlers();

    expect(eventBus.listenerCount('USER_AVAILABLE_PRODUCTS_UPDATED')).toBe(1);
  });

  describe('USER_LOGGED_OUT event', () => {
    it('should call stopAndClearBackups when USER_LOGGED_OUT is emitted', () => {
      registerEventBusBackupHandlers();

      eventBus.emit('USER_LOGGED_OUT');

      expect(backupManager.stopAndClearBackups).toHaveBeenCalledTimes(1);
    });
  });

  describe('USER_WAS_UNAUTHORIZED event', () => {
    it('should call stopAndClearBackups when USER_WAS_UNAUTHORIZED is emitted', () => {
      registerEventBusBackupHandlers();

      eventBus.emit('USER_WAS_UNAUTHORIZED');

      expect(backupManager.stopAndClearBackups).toHaveBeenCalledTimes(1);
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

      expect(logger.debug).toHaveBeenCalledWith({
        tag: 'BACKUPS',
        msg: 'User has the backup feature available, starting backups',
      });
      expect(startBackupsIfAvailable).toHaveBeenCalledTimes(1);
    });

    it('should call stopAndClearBackups when products have backups disabled', () => {
      registerEventBusBackupHandlers();

      eventBus.emit('USER_AVAILABLE_PRODUCTS_UPDATED', mockProductsWithoutBackups);

      expect(logger.debug).toHaveBeenCalledWith({
        tag: 'BACKUPS',
        msg: 'User does not have the backup feature available',
      });
      expect(backupManager.stopAndClearBackups).toHaveBeenCalledTimes(1);
    });
  });
});
