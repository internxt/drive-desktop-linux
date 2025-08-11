import { getHeaders } from '../auth/service';

/** TODO - Move this tho NEW_DRIVE_URL */
export function deleteFolder(folderId: number) {
  return fetch(`${process.env.API_URL}/storage/folder/${folderId}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
}
