/**
 * property to define a regular file when requesting in the get attributes fuse request.
 * encodes both file type and permissions
 */
export const FILE_MODE = 33188;
/**
 * property to define a folder when requesting in the get attributes fuse request.
 * encodes both file type and permissions
 */
export const FOLDER_MODE = 16877;

export type GetAttributesCallbackData = {
  mode: number;
  size: number;
  mtime: Date;
  ctime: Date;
  atime?: Date;
  uid: number;
  gid: number;
  /** this property tells the kernel the number of hard links
   * for directories this is at least 2
   * when nlink reaches 0 and no process has the file open, the kernel interprets
   * its a deleted file/folder
   * */
  nlink: number;
};
