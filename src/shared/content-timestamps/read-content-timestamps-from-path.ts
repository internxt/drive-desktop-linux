import { safeStat } from '../../infra/local-file-system/safe-stat';
import { contentTimestampsFromStats, type ContentTimestamps } from './content-timestamps-from-stats';

type Props = { absolutePath: string };

export async function readContentTimestampsFromPath({ absolutePath }: Props): Promise<ContentTimestamps | undefined> {
  const { data, error } = await safeStat(absolutePath);
  if (error || (!data.isFile() && !data.isDirectory())) {
    return undefined;
  }

  return contentTimestampsFromStats(data);
}
