import { type Network } from '@internxt/sdk';
import { withDownloadLinksCache } from './with-download-links-cache';

type DownloadLinks = Awaited<ReturnType<Network.Network['getDownloadLinks']>>;

let uniqueId = 0;

function nextFileId() {
  uniqueId += 1;
  return `file-${uniqueId}`;
}

function buildLinks({ url }: { url: string }): DownloadLinks {
  return {
    bucket: 'bucket-id',
    index: 'index',
    created: new Date(),
    size: 10,
    version: 2,
    shards: [{ index: 0, hash: 'hash', size: 10, url }],
  };
}

function urlExpiringIn({ seconds }: { seconds: number }) {
  return `https://example.com/file?AWSAccessKeyId=abc&Expires=${Math.floor(Date.now() / 1000) + seconds}&Signature=x`;
}

function buildNetwork({
  resolve,
  authorizationContext = 'context-a',
}: {
  resolve: ReturnType<typeof vi.fn>;
  authorizationContext?: string;
}) {
  return withDownloadLinksCache({
    network: { getDownloadLinks: resolve } as unknown as Network.Network,
    authorizationContext,
  });
}

describe('with-download-links-cache', () => {
  it('should resolve links only once for repeated reads of the same file', async () => {
    const links = buildLinks({ url: urlExpiringIn({ seconds: 3600 }) });
    const resolve = vi.fn().mockResolvedValue(links);
    const network = buildNetwork({ resolve });
    const fileId = nextFileId();

    const first = await network.getDownloadLinks('bucket-id', fileId);
    const second = await network.getDownloadLinks('bucket-id', fileId);

    expect(resolve).toHaveBeenCalledOnce();
    expect(first).toStrictEqual(links);
    expect(second).toStrictEqual(links);
  });

  it('should scope cached links by bucket and file', async () => {
    const resolve = vi.fn().mockResolvedValue(buildLinks({ url: urlExpiringIn({ seconds: 3600 }) }));
    const network = buildNetwork({ resolve });
    const fileId = nextFileId();

    await network.getDownloadLinks('bucket-id', fileId);
    await network.getDownloadLinks('other-bucket', fileId);
    await network.getDownloadLinks('bucket-id', nextFileId());

    expect(resolve).toHaveBeenCalledTimes(3);
  });

  it('should not cache links that are already expired', async () => {
    const resolve = vi.fn().mockResolvedValue(buildLinks({ url: urlExpiringIn({ seconds: -3600 }) }));
    const network = buildNetwork({ resolve });
    const fileId = nextFileId();

    await network.getDownloadLinks('bucket-id', fileId);
    await network.getDownloadLinks('bucket-id', fileId);

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('should not cache links without a parseable expiry', async () => {
    const resolve = vi.fn().mockResolvedValue(buildLinks({ url: 'https://example.com/file' }));
    const network = buildNetwork({ resolve });
    const fileId = nextFileId();

    await network.getDownloadLinks('bucket-id', fileId);
    await network.getDownloadLinks('bucket-id', fileId);

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('should forward the token to the underlying client', async () => {
    const resolve = vi.fn().mockResolvedValue(buildLinks({ url: urlExpiringIn({ seconds: 3600 }) }));
    const network = buildNetwork({ resolve });
    const fileId = nextFileId();

    await network.getDownloadLinks('bucket-id', fileId, 'a-token');

    expect(resolve).toHaveBeenCalledWith('bucket-id', fileId, 'a-token');
  });

  it('should hit the network once when concurrent callers ask for the same file', async () => {
    const links = buildLinks({ url: urlExpiringIn({ seconds: 3600 }) });
    const resolve = vi.fn().mockResolvedValue(links);
    const network = buildNetwork({ resolve });
    const fileId = nextFileId();

    const results = await Promise.all([
      network.getDownloadLinks('bucket-id', fileId),
      network.getDownloadLinks('bucket-id', fileId),
      network.getDownloadLinks('bucket-id', fileId),
    ]);

    expect(resolve).toHaveBeenCalledOnce();
    expect(results).toStrictEqual([links, links, links]);
  });

  it('should isolate cached and in-flight links between authorization contexts', async () => {
    const firstLinks = buildLinks({ url: urlExpiringIn({ seconds: 3600 }) });
    const secondLinks = buildLinks({ url: urlExpiringIn({ seconds: 3600 }) });
    const firstResolve = vi.fn().mockResolvedValue(firstLinks);
    const secondResolve = vi.fn().mockResolvedValue(secondLinks);
    const firstNetwork = buildNetwork({ resolve: firstResolve, authorizationContext: 'user-a' });
    const secondNetwork = buildNetwork({ resolve: secondResolve, authorizationContext: 'user-b' });
    const fileId = nextFileId();

    const [firstResult, secondResult] = await Promise.all([
      firstNetwork.getDownloadLinks('bucket-id', fileId),
      secondNetwork.getDownloadLinks('bucket-id', fileId),
    ]);

    expect(firstResult).toStrictEqual(firstLinks);
    expect(secondResult).toStrictEqual(secondLinks);
    expect(firstResolve).toHaveBeenCalledOnce();
    expect(secondResolve).toHaveBeenCalledOnce();

    await firstNetwork.getDownloadLinks('bucket-id', fileId);
    await secondNetwork.getDownloadLinks('bucket-id', fileId);

    expect(firstResolve).toHaveBeenCalledOnce();
    expect(secondResolve).toHaveBeenCalledOnce();
  });

  it('should retry after a failed in-flight request instead of caching the failure', async () => {
    const links = buildLinks({ url: urlExpiringIn({ seconds: 3600 }) });
    const resolve = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValue(links);
    const network = buildNetwork({ resolve });
    const fileId = nextFileId();

    await expect(network.getDownloadLinks('bucket-id', fileId)).rejects.toThrow('network error');
    await expect(network.getDownloadLinks('bucket-id', fileId)).resolves.toStrictEqual(links);

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('should evict the least recently used entry once full', async () => {
    const resolve = vi.fn().mockResolvedValue(buildLinks({ url: urlExpiringIn({ seconds: 3600 }) }));
    const network = buildNetwork({ resolve });
    const oldest = nextFileId();
    const secondOldest = nextFileId();

    await network.getDownloadLinks('bucket-id', oldest);
    await network.getDownloadLinks('bucket-id', secondOldest);
    for (let index = 0; index < 2000; index++) {
      await network.getDownloadLinks('bucket-id', nextFileId());
    }

    resolve.mockClear();
    await network.getDownloadLinks('bucket-id', oldest);

    expect(resolve).toHaveBeenCalledOnce();
  });
});
