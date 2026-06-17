declare module 'source-map-support' {
  type InstallOptions = {
    environment?: string;
    hookRequire?: boolean;
    emptyCacheBetweenOperations?: boolean;
    handleUncaughtExceptions?: boolean;
  };

  export function install(options?: InstallOptions): void;
}
