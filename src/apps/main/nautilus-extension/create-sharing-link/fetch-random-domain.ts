import { fetchPublicSharingDomains } from '../../../../infra/drive-server/services/sharings/services/fetch-public-sharing-domains';
import { ShareDomainsResponse } from './types';
import { toError } from './to-error';

export async function fetchRandomDomain() {
  const result = await fetchPublicSharingDomains();

  if (result.error) {
    throw toError({
      context: 'Error while fetching public sharing domains',
      error: result.error,
    });
  }

  const domains = getDomains(result.data);

  if (domains.length === 0) {
    throw new Error('No share domains available');
  }

  const randomIndex = Math.floor(Math.random() * domains.length);

  return domains[randomIndex].replace(/\/$/, '');
}

function getDomains(data: ShareDomainsResponse | string[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.list;
}
