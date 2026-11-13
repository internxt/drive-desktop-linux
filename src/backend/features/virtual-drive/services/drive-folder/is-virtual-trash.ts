export function isVirtualTrashPath(path: string) {
  return /^\/\.Trash(?:$|\/)|^\/\.Trash-\d+(?:$|\/)/.test(path);
}

export function isVirtualTrashFolder(folder: { path: string }) {
  return isVirtualTrashPath(folder.path);
}
