import { runWithDirectoryMetadataWriteLock } from './run-with-directory-metadata-write-lock';

describe('run-with-directory-metadata-write-lock', () => {
  function deferred() {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  it('should keep a later operation waiting until the earlier one finishes', async () => {
    const events: string[] = [];
    const gate = deferred();

    const first = runWithDirectoryMetadataWriteLock({
      operation: async () => {
        events.push('first-start');
        await gate.promise;
        events.push('first-end');
      },
    });
    const second = runWithDirectoryMetadataWriteLock({
      operation: async () => {
        events.push('second');
      },
    });

    await Promise.resolve();
    expect(events).toStrictEqual(['first-start']);

    gate.resolve();
    await Promise.all([first, second]);

    expect(events).toStrictEqual(['first-start', 'first-end', 'second']);
  });

  it('should run the next operation when the previous one rejects', async () => {
    const events: string[] = [];
    const gate = deferred();

    const first = runWithDirectoryMetadataWriteLock({
      operation: async () => {
        events.push('first');
        await gate.promise;
        throw new Error('fail');
      },
    });
    const second = runWithDirectoryMetadataWriteLock({
      operation: async () => {
        events.push('second');
      },
    });
    const firstRejection = expect(first).rejects.toThrow('fail');

    gate.resolve();
    await firstRejection;
    await second;

    expect(events).toStrictEqual(['first', 'second']);
  });
});
