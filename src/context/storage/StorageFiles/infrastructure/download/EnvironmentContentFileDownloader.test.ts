import { Readable } from 'stream';
import { EnvironmentContentFileDownloader } from './EnvironmentContentFileDownloader';

/**
 * `Environment.download` is typed `DownloadStrategyFunction`, which returns an
 * `ActionState` and delivers its result through `opts.finishedCallback`. These
 * tests hold the adapter to that contract, which is the one the SDK actually
 * has.
 */
function buildEnvironment({ finish }: { finish: 'stream' | 'error' | 'never' }) {
  const actionState = { on: vi.fn(), once: vi.fn(), emit: vi.fn(), removeAllListeners: vi.fn() };
  const stream = new Readable({ read() {} });
  const error = new Error('network down');
  let captured: Record<string, unknown> | undefined;

  const environment = {
    download: vi.fn((_bucketId: string, _fileId: string, opts: Record<string, unknown>) => {
      captured = opts;
      if (finish !== 'never') {
        const done = opts.finishedCallback as (e: Error | null, s: Readable | null) => void;
        setImmediate(() => (finish === 'stream' ? done(null, stream) : done(error, null)));
      }
      return actionState;
    }),
    downloadCancel: vi.fn(),
  };

  return { environment, actionState, stream, error, opts: () => captured };
}

describe('EnvironmentContentFileDownloader', () => {
  it('resolves with the stream delivered through finishedCallback', async () => {
    const { environment, stream } = buildEnvironment({ finish: 'stream' });
    const sut = new EnvironmentContentFileDownloader(environment as never, 'bucket-id');

    await expect(sut.downloadById('file-id')).resolves.toBe(stream);
  });

  it('rejects with the error delivered through finishedCallback', async () => {
    const { environment } = buildEnvironment({ finish: 'error' });
    const sut = new EnvironmentContentFileDownloader(environment as never, 'bucket-id');

    await expect(sut.downloadById('file-id')).rejects.toThrow('network down');
  });

  it('passes finishedCallback, which is a required member of DownloadOptions', async () => {
    const { environment, opts } = buildEnvironment({ finish: 'stream' });
    const sut = new EnvironmentContentFileDownloader(environment as never, 'bucket-id');

    await sut.downloadById('file-id');

    expect(opts()?.finishedCallback).toBeTypeOf('function');
  });

  it('cancels an in-flight download through downloadCancel, which is the SDK cancellation handle', async () => {
    const { environment, actionState, opts } = buildEnvironment({ finish: 'never' });
    const sut = new EnvironmentContentFileDownloader(environment as never, 'bucket-id');

    const pending = sut.downloadById('file-id');
    await new Promise((resolve) => setImmediate(resolve));

    sut.forceStop();
    expect(environment.downloadCancel).toHaveBeenCalledWith(actionState);

    // Let the pending promise settle so the test does not leak it.
    (opts()?.finishedCallback as (e: Error | null, s: Readable | null) => void)(new Error('aborted'), null);
    await expect(pending).rejects.toThrow('aborted');
  });
});
