const supportedFileManagers = ['nautilus', 'nemo', 'dolphin', null] as const;
export type SupportedFileManager = (typeof supportedFileManagers)[number];

export const NAUTILUS_EXTENSION_FILENAME = 'internxt-virtual-drive.py';
export const NEMO_EXTENSION_FILENAME = 'internxt-virtual-drive.py';
export const DOLPHIN_MENU_FILENAME = 'internxt-virtual-drive.desktop';
export const DOLPHIN_HELPER_FILENAME = 'internxt-dolphin-actions.sh';

export function isSupportedFileManager(value: SupportedFileManager): value is SupportedFileManager {
  return supportedFileManagers.includes(value);
}
