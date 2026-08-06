const uploadSizeLimitBlockedPaths = new Set<string>();

export function markUploadSizeLimitBlockedPath(path: string): void {
  uploadSizeLimitBlockedPaths.add(path);
}

export function isUploadSizeLimitBlockedPath(path: string): boolean {
  return uploadSizeLimitBlockedPaths.has(path);
}

export function clearUploadSizeLimitBlockedPath(path: string): void {
  uploadSizeLimitBlockedPaths.delete(path);
}
