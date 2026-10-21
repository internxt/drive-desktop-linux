import { TRASH_UID_FOLDER_ID } from './constants';

export function isVirtualTrashPath(path: string) {
  return /^\/\.Trash(?:$|\/)|^\/\.Trash-\d+(?:$|\/)/.test(path);
}

export function isVirtualTrashFolder(folder: { path: string; id: number }) {
  return isVirtualTrashPath(folder.path) || folder.id >= TRASH_UID_FOLDER_ID;
}
