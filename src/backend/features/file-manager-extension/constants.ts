const supportedFileManagers = [
  'nautilus',
  'nemo',
  'dolphin',
] as const;
type SupportedFileManager = (typeof supportedFileManagers)[number];

export function isSupportedFileManager(
  value: string,
): value is SupportedFileManager {
  return (supportedFileManagers as readonly string[]).includes(value);
}