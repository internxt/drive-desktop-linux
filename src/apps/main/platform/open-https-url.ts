import { logger } from '@internxt/drive-desktop-core/build/backend';
import { shell } from 'electron';

type Props = { url: string };

/**
 * The renderer can ask the main process to open a link. shell.openExternal
 * hands that string to the OS, so only https is accepted here.
 */
export async function openHttpsUrl({ url }: Props) {
  const safeUrl = httpsUrl({ url });

  if (!safeUrl) return;

  return shell.openExternal(safeUrl);
}

function httpsUrl({ url }: Props) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch (error) {
    logger.warn({
      msg: 'Rejected open-url because the URL is invalid',
      error,
    });
    return null;
  }

  if (parsed.protocol !== 'https:') {
    logger.warn({
      msg: 'Rejected open-url because the protocol is not https',
      protocol: parsed.protocol,
    });
    return null;
  }

  return parsed.href;
}
