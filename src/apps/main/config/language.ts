import { broadcastToWindows } from '../windows';
import { electronStore } from '../config';

export function getLanguage() {
  return electronStore.get('preferedLanguage');
}

export function broadcastLanguage(): void {
  broadcastToWindows('preferedLanguage-updated', getLanguage());
}
