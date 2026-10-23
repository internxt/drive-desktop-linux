import { Result } from '../../../context/shared/domain/Result';
import { getRawUsageAndLimit } from './get-raw-usage-and-limit';
import { RawUsage } from './usage.types';

/**
 * Esteban Galvis Triana
 * V2.7.0
 * How long a usage and limit reading may be reused.
 *
 * A save used to call /users/usage and /users/limit once per file, and the
 * uploader asks twice (the recorded size, then the snapshot size). Those two
 * endpoints were the calls tripping 429s. The two checks of one file, and the
 * files that start with it, land within a few seconds, so this only has to
 * cover that burst. Longer than that and a save near the quota keeps
 * approving space the server has already consumed.
 */
export const USAGE_AND_LIMIT_CACHE_TTL_MS = 5_000;

type CacheEntry = {
  value: Result<RawUsage, Error>;
  fetchedAt: number;
};

let cached: CacheEntry | undefined;
let inFlight: Promise<Result<RawUsage, Error>> | undefined;

export async function getCachedRawUsageAndLimit() {
  if (isFresh(cached)) {
    return cached.value;
  }

  // Assign before the first await so overlapping checks share one pair of
  // requests instead of each opening their own.
  if (!inFlight) {
    inFlight = loadUsageAndLimit();
  }

  return inFlight;
}

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return entry !== undefined && Date.now() - entry.fetchedAt < USAGE_AND_LIMIT_CACHE_TTL_MS;
}

async function loadUsageAndLimit() {
  try {
    const result = await getRawUsageAndLimit();

    // A failure must not stick: the next file should try again once the 429
    // has cleared, instead of failing the rest of the save for the whole TTL.
    if (!result.error) {
      cached = { value: result, fetchedAt: Date.now() };
    }

    return result;
  } finally {
    inFlight = undefined;
  }
}
