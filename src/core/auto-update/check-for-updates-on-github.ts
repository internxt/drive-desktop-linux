import https from 'node:https';
import { logger } from '@internxt/drive-desktop-core/build/backend';

const GITHUB_API_OPTIONS = {
  hostname: 'api.github.com',
  path: '/repos/internxt/drive-desktop-linux/releases/latest',
  headers: { 'User-Agent': 'internxt-drive-desktop', Accept: 'application/vnd.github.v3+json' },
};

type Props = {
  currentVersion: string;
};

export async function checkForUpdatesOnGithub({ currentVersion }: Props) {
  return new Promise<{ version: string } | null>((resolve) => {
    https
      .get(GITHUB_API_OPTIONS, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              logger.warn({ msg: `AutoUpdater (github): GitHub API responded with ${res.statusCode}` });
              return resolve(null);
            }
            const release = JSON.parse(data) as { tag_name: string };
            const latestVersion = release.tag_name.replace(/^v/, '');

            logger.debug({ msg: 'AutoUpdater (github): version check', latestVersion, currentVersion });

            if (latestVersion !== currentVersion) {
              logger.debug({ msg: 'AutoUpdater (github): update available', version: latestVersion });
              return resolve({ version: latestVersion });
            }

            resolve(null);
          } catch (err) {
            logger.error({ msg: 'AutoUpdater (github): error parsing response', err });
            resolve(null);
          }
        });
      })
      .on('error', (err) => {
        logger.error({ msg: 'AutoUpdater (github): error checking for updates', err });
        resolve(null);
      });
  });
}
