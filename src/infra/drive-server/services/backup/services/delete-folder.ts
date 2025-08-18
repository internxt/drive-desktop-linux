import fetch from 'electron-fetch';
import { getNewApiHeaders } from '../../../../../apps/main/auth/service';

export function deleteFolder(folderId: number) {
  return fetch(`${process.env.NEW_DRIVE_URL}/storage/trash/${folderId}`, {
    method: 'DELETE',
    headers: getNewApiHeaders(),
  });
}
