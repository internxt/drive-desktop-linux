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

export type TrashFilesPaths = {
  localShareTrash: string;
  legacyTrash: string;
  xdgDataTrash?: string;
};
