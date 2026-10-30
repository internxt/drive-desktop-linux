import eventBus from '../event-bus';
import { PATHS } from '../../../core/electron/paths';
import {
  getIsAppDataSourceBootstrapComplete,
  resetAppDataSourceBootstrapState,
  setAppDataSourceBootstrapComplete,
} from './app-data-source-bootstrap-state';
import { AppDataSource } from './data-source';
import { initializeVirtualDriveSqlite, migrateLegacyRemoteSyncSchemaOnDisk } from './initialize-virtual-drive-sqlite';

export async function bootstrapAppDataSource() {
  migrateLegacyRemoteSyncSchemaOnDisk({ databasePath: PATHS.DATABASE });

  if (!AppDataSource.isInitialized) {
    resetAppDataSourceBootstrapState();
    await AppDataSource.initialize();
  }

  if (getIsAppDataSourceBootstrapComplete()) {
    return;
  }

  await initializeVirtualDriveSqlite();
  setAppDataSourceBootstrapComplete(true);
  eventBus.emit('APP_DATA_SOURCE_INITIALIZED');
}
