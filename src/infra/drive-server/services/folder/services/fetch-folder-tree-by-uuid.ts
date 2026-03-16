import { driveServerClient } from '../../../client/drive-server.client.instance';

export async function fetchFolderTreeByUuid({ uuid }: { uuid: string }) {
  const { data, error } = await driveServerClient.GET('/folders/{uuid}/tree', {
    path: { uuid },
  });

  if (error) return { error };

  return { data };
}
