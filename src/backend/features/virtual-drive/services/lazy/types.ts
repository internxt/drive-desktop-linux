export type DirectoryStatusScope = 'EXISTS';

export type DirectoryStateRow = {
  folder_id?: number;
  children_loaded_at: string | null;
  children_last_error_at: string | null;
  fetch_state: string;
};

export type SqliteQueryExecutor = {
  isInitialized: boolean;
  query: (statement: string, parameters?: Array<unknown>) => Promise<Array<DirectoryStateRow>>;
};

export type DirectoryStateProps = {
  folderId: number;
  statusScope: DirectoryStatusScope;
};

export type DirectoryStateRepositoryProps = {
  dataSource?: SqliteQueryExecutor;
};

export type DirectoryStateOperationProps = DirectoryStateProps & DirectoryStateRepositoryProps;

export type DirectoryStateErrorProps = DirectoryStateOperationProps & {
  failureState?: 'error' | 'error_before_mutation' | 'error_not_found';
};

export type DirectoryStateFreshnessProps = DirectoryStateOperationProps & {
  ttlMs?: number;
};
