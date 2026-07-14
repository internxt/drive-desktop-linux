import packageConfig from '../../../../package.json';
import { getCredentials } from './get-credentials';

export function getBaseApiHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json; charset=utf-8',
    'internxt-client': 'drive-desktop-linux',
    'internxt-version': packageConfig.version,
    'x-internxt-desktop-header': process.env.INTERNXT_DESKTOP_HEADER_KEY || '',
  };
}

export function getNewApiHeaders(): Record<string, string> {
  const { newToken } = getCredentials();

  return {
    Authorization: `Bearer ${newToken}`,
    ...getBaseApiHeaders(),
  };
}
