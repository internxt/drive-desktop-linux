import { mockDeep } from 'vitest-mock-extended';
import type { Container } from 'diod';
import { createConcurrentFolderRunner } from './concurrent-folder-runner';
import type { ThumbnailFolderTask } from './types';

vi.mock('@internxt/drive-desktop-core/build/backend');

describe('concurrent-folder-runner', () => {
  it('should process queued folders FIFO with the configured concurrency limit', async () => {
    const container = mockDeep<Container>();
    const resolvers: Array<() => void> = [];
    const startedFolders: string[] = [];
    const processFolder = vi.fn((task: ThumbnailFolderTask) => {
      startedFolders.push(task.folderPath);
      return new Promise<void>((resolve) => resolvers.push(resolve));
    });
    const runner = createConcurrentFolderRunner({ processFolder, concurrency: 2 });

    for (const folderPath of ['/first', '/second', '/third']) {
      runner.enqueue({
        task: { folderPath, fileNames: [], container, enqueuedAt: 0 },
      });
    }

    expect(processFolder).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(2));
    expect(runner.getActiveWorkers()).toBe(2);
    expect(startedFolders).toStrictEqual(['/first', '/second']);
    expect(runner.getState().items.map(({ folderPath }) => folderPath)).toStrictEqual(['/third']);

    resolvers[0]();
    await vi.waitFor(() => expect(startedFolders).toStrictEqual(['/first', '/second', '/third']));
    expect(runner.getActiveWorkers()).toBe(2);

    resolvers[1]();
    resolvers[2]();
    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(0));
    expect(runner.getState().processing.size).toBe(0);
  });

  it('should continue processing after a folder task fails', async () => {
    const container = mockDeep<Container>();
    const processFolder = vi.fn().mockRejectedValueOnce(new Error('sync failure')).mockResolvedValueOnce(undefined);
    const runner = createConcurrentFolderRunner({ processFolder, concurrency: 1 });

    runner.enqueue({ task: { folderPath: '/failed', fileNames: [], container, enqueuedAt: 0 } });
    runner.enqueue({ task: { folderPath: '/next', fileNames: [], container, enqueuedAt: 1 } });

    await vi.waitFor(() => expect(processFolder).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(0));
    expect(runner.getState().processing.size).toBe(0);
  });

  it('should deduplicate queued, running and successfully completed folder listings', async () => {
    const container = mockDeep<Container>();
    let resolveTask: () => void = () => undefined;
    const processFolder = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveTask = resolve;
        }),
    );
    const runner = createConcurrentFolderRunner({ processFolder });
    const task = { folderPath: '/photos', fileNames: ['first.jpg', 'second.jpg'], container, enqueuedAt: 0 };

    runner.enqueue({ task });
    runner.enqueue({ task });
    expect(runner.getState().items).toHaveLength(1);
    await vi.waitFor(() => expect(processFolder).toHaveBeenCalledTimes(1));
    runner.enqueue({ task });
    expect(runner.getState().items).toHaveLength(0);

    resolveTask();
    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(0));
    runner.enqueue({ task: { ...task, fileNames: ['second.jpg', 'first.jpg'], enqueuedAt: 1 } });
    expect(runner.getState().items).toHaveLength(0);
    expect(runner.getState().completed.size).toBe(1);
    expect(processFolder).toHaveBeenCalledTimes(1);
  });

  it.each(['rejection', 'unsuccessful result'])('should allow retry after %s', async (failure) => {
    const processFolder = vi.fn<() => Promise<boolean>>();
    if (failure === 'rejection') processFolder.mockRejectedValueOnce(new Error('sync failed'));
    else processFolder.mockResolvedValueOnce(false);
    processFolder.mockResolvedValueOnce(true);
    const runner = createConcurrentFolderRunner({ processFolder });
    const task = { folderPath: '/photos', fileNames: ['photo.jpg'], container: mockDeep<Container>(), enqueuedAt: 0 };

    runner.enqueue({ task });
    await vi.waitFor(() => expect(processFolder).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(0));
    expect(runner.getState().completed.size).toBe(0);
    runner.enqueue({ task });
    await vi.waitFor(() => expect(processFolder).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(0));
    expect(runner.getState().completed.size).toBe(1);
  });

  it('should process a changed listing after a folder has completed', async () => {
    const processFolder = vi.fn().mockResolvedValue(true);
    const runner = createConcurrentFolderRunner({ processFolder });
    const task = { folderPath: '/photos', fileNames: ['first.jpg'], container: mockDeep<Container>(), enqueuedAt: 0 };
    runner.enqueue({ task });
    await vi.waitFor(() => expect(processFolder).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(0));

    runner.enqueue({ task: { ...task, fileNames: ['first.jpg', 'second.jpg'] } });

    await vi.waitFor(() => expect(processFolder).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(0));
  });

  it('should abort queue and clear queued/processing tasks', async () => {
    const container = mockDeep<Container>();
    const processFolder = vi.fn(() => new Promise<void>(() => undefined));
    const runner = createConcurrentFolderRunner({ processFolder, concurrency: 1 });

    runner.enqueue({ task: { folderPath: '/first', fileNames: [], container, enqueuedAt: 0 } });
    runner.enqueue({ task: { folderPath: '/second', fileNames: [], container, enqueuedAt: 1 } });

    await vi.waitFor(() => expect(runner.getActiveWorkers()).toBe(1));
    runner.abort();

    expect(runner.getState().items).toHaveLength(0);
    expect(runner.getState().processing.size).toBe(0);
  });
});
