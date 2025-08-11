import { components } from '../../../infra/schemas';
import { Result } from '../../../context/shared/domain/Result';
import { getNewApiHeaders } from '../auth/service';

export async function fetchFolderById(
  folderId: string
): Promise<Result<components['schemas']['GetFolderContentDto'], Error>> {
  try {
    const res = await fetch(
      `${process.env.NEW_DRIVE_URL}/folders/content/${folderId}`,
      {
        method: 'GET',
        headers: getNewApiHeaders(),
      }
    );
    if (!res.ok) {
      return { error: new Error('Unsuccessful request to fetch folder') };
    }

    const responseBody: components['schemas']['GetFolderContentDto'] = await res
      .json()
      .catch(() => null);

    if (responseBody?.deleted || responseBody?.removed) {
      return { error: new Error('Folder does not exist') };
    }
    return { data: responseBody };
  } catch (error) {
    return { error: new Error('Unsuccessful request to fetch folder') };
  }
}
