import { type Network } from '@internxt/sdk';
import { parseSignedUrlExpiry } from './parse-signed-url-expiry';

const CACHE_SAFETY_MARGIN_MS = 60_000;
/**
 * Bounds memory for sessions that browse many folders. Entries are evicted
 * least-recently-used first, independent of their TTL.
 */
const MAX_CACHE_ENTRIES = 2000;

type DownloadLinks = Awaited<ReturnType<Network.Network['getDownloadLinks']>>;

type CacheEntry = {
  links: DownloadLinks;
  expiresAt: number;
};

// Module-level because a Network client is built per FUSE read, so an
// instance-scoped cache would never be reused across calls.
const cache = new Map<string, CacheEntry>();
// Warming and the real read routinely ask for the same link at the same time.
// Without this, both miss the (completed-only) cache and both hit the network.
const inFlight = new Map<string, Promise<DownloadLinks>>();

function cacheKeyFor({
  authorizationContext,
  bucketId,
  fileId,
  token,
}: {
  authorizationContext: string;
  bucketId: string;
  fileId: string;
  token?: string;
}) {
  return `${authorizationContext}:${bucketId}:${fileId}:${token ?? ''}`;
}

function readEntry({
  authorizationContext,
  bucketId,
  fileId,
  token,
}: {
  authorizationContext: string;
  bucketId: string;
  fileId: string;
  token?: string;
}) {
  const key = cacheKeyFor({ authorizationContext, bucketId, fileId, token });
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }

  // Map keeps insertion order, so re-inserting marks the entry as most recent.
  cache.delete(key);
  cache.set(key, entry);
  return entry.links;
}

function writeEntry({
  authorizationContext,
  bucketId,
  fileId,
  token,
  links,
}: {
  authorizationContext: string;
  bucketId: string;
  fileId: string;
  token?: string;
  links: DownloadLinks;
}) {
  if (links.shards.length === 0) return;

  const expiries: number[] = [];
  for (const shard of links.shards) {
    const expiry = parseSignedUrlExpiry({ url: shard.url });
    if (expiry === undefined) return;
    expiries.push(expiry);
  }

  const expiresAt = Math.min(...expiries) - CACHE_SAFETY_MARGIN_MS;
  if (expiresAt <= Date.now()) return;

  const key = cacheKeyFor({ authorizationContext, bucketId, fileId, token });
  cache.delete(key);

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  cache.set(key, { links, expiresAt });
}

export function withDownloadLinksCache({
  network,
  authorizationContext,
}: {
  network: Network.Network;
  authorizationContext: string;
}) {
  const resolveLinks = network.getDownloadLinks.bind(network);

  network.getDownloadLinks = async (bucketId, fileId, token) => {
    const cached = readEntry({ authorizationContext, bucketId, fileId, token });
    if (cached) return cached;

    const key = cacheKeyFor({ authorizationContext, bucketId, fileId, token });
    const pending = inFlight.get(key);
    if (pending) return await pending;

    const request = resolveLinks(bucketId, fileId, token)
      .then((links) => {
        writeEntry({ authorizationContext, bucketId, fileId, token, links });
        return links;
      })
      .finally(() => inFlight.delete(key));

    inFlight.set(key, request);
    return await request;
  };

  return network;
}
