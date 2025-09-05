export type CleanableItem = {
  /** Absolute file path for deletion operations */
  fullPath: string;
  /** Display name for UI */
  fileName: string;
  /** File size in bytes */
  sizeInBytes: number;
};

export type CleanerSection = {
  /** Total size of all items in bytes */
  totalSizeInBytes: number;
  /** Array of cleanable items in this section */
  items: CleanableItem[];
};

export type CleanerReport = {
  /** App cache files and directories */
  appCache: CleanerSection;
  /** Log files */
  logFiles: CleanerSection;
  /** Trash/recycle bin contents */
  trash: CleanerSection;
  /** Web storage (cookies, local storage) */
  webStorage: CleanerSection;
  /** Web browser cache */
  webCache: CleanerSection;
};

export const mockCleanerData: CleanerReport = {
  appCache: {
    totalSizeInBytes: 2147483648, // 2GB
    items: [
      {
        fullPath: '/Users/alexis/Library/Caches/com.app1/cache1.db',
        fileName: 'App1 Cache',
        sizeInBytes: 1073741824,
      },
      {
        fullPath: '/Users/alexis/Library/Caches/com.app2/cache2.db',
        fileName: 'App2 Cache',
        sizeInBytes: 1073741824,
      },
    ],
  },
  logFiles: {
    totalSizeInBytes: 536870912, // 512MB
    items: [
      {
        fullPath: '/Users/alexis/Library/Logs/system.log',
        fileName: 'System Log',
        sizeInBytes: 268435456,
      },
      {
        fullPath: '/Users/alexis/Library/Logs/app.log',
        fileName: 'Application Log',
        sizeInBytes: 268435456,
      },
    ],
  },
  trash: {
    totalSizeInBytes: 1610612736, // 1.5GB
    items: [
      {
        fullPath: '/Users/alexis/.Trash/old_document.pdf',
        fileName: 'old_document.pdf',
        sizeInBytes: 805306368,
      },
      {
        fullPath: '/Users/alexis/.Trash/unused_app.dmg',
        fileName: 'unused_app.dmg',
        sizeInBytes: 805306368,
      },
    ],
  },
  webStorage: {
    totalSizeInBytes: 268435456, // 256MB
    items: [
      {
        fullPath: '/Users/alexis/Library/WebKit/LocalStorage/cookies.db',
        fileName: 'Browser Cookies',
        sizeInBytes: 134217728,
      },
      {
        fullPath: '/Users/alexis/Library/WebKit/LocalStorage/storage.db',
        fileName: 'Local Storage',
        sizeInBytes: 134217728,
      },
    ],
  },
  webCache: {
    totalSizeInBytes: 1073741824, // 1GB
    items: [
      {
        fullPath: '/Users/alexis/Library/Caches/Safari/cache.db',
        fileName: 'Safari Cache',
        sizeInBytes: 536870912,
      },
      {
        fullPath: '/Users/alexis/Library/Caches/Chrome/cache.db',
        fileName: 'Chrome Cache',
        sizeInBytes: 536870912,
      },
    ],
  },
};
