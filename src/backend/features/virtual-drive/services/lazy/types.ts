export type DirectoryStatusScope = 'EXISTS';

export type DirectoryStateRow = {
  children_loaded_at: string | null;
};

export type SqliteQueryExecutor = {
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

export type DirectoryStateFreshnessProps = DirectoryStateOperationProps & {
  ttlMs?: number;
};
