export function handleCleanup() {
  // TODO: Implement
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  );
}

export const sectionConfig = {
  appCache: { name: 'App Cache', color: '#3B82F6' },
  logFiles: { name: 'Log Files', color: '#10B981' },
  trash: { name: 'Trash', color: '#F59E0B' },
  webStorage: { name: 'Web Storage', color: '#EF4444' },
  webCache: { name: 'Web Cache', color: '#8B5CF6' },
};
