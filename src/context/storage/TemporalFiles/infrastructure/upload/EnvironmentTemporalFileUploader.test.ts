import type { UploadStrategyFunction } from '@internxt/inxt-js/build/lib/core/upload/strategy';
import { Readable } from 'node:stream';
import { EnvironmentTemporalFileUploader } from './EnvironmentTemporalFileUploader';

describe('EnvironmentTemporalFileUploader', () => {
  let contents: Readable;

  /** A destroyed stream emits its error a tick after the rejection arrives. */
  function tick() {
    return new Promise((resolve) => setImmediate(resolve));
  }

  function uploaderThatFailsWith(error: Error) {
    const fn = vi.fn().mockRejectedValue(error) as unknown as UploadStrategyFunction;
    const sut = new EnvironmentTemporalFileUploader(fn, 'bucket');

    // The class emits its own 'error' event, which throws when unheard. In
    // production the factory always registers one.
    sut.on('error', () => {});

    return sut;
  }

  beforeEach(() => {
    contents = Readable.from(['content']);
  });

  it('should not raise an uncaught exception when nothing is listening on the source', async () => {
    // The production case: the upload fails before the library has attached its
    // pipeline, so the source stream has no 'error' listener of its own. No
    // listener is registered here on purpose, because that is the whole point.
    const failure = new Error('Request failed with status code 502');
    const uncaught = vi.fn();
    process.on('uncaughtException', uncaught);

    try {
      await expect(uploaderThatFailsWith(failure).upload(contents, 7)).rejects.toThrow(failure);
      await tick();

      expect(uncaught).not.toHaveBeenCalled();
    } finally {
      process.off('uncaughtException', uncaught);
    }
  });

  it('should still hand the real failure to a consumer already listening on the source', async () => {
    // Stands in for the library's pipeline, attached once the transfer has
    // begun. It must keep receiving the actual error rather than a premature
    // close, which is what makes this safe to do on every failure.
    const failure = new Error('Request failed with status code 502');
    const pipelineErrors = vi.fn<(error: Error) => void>();
    contents.on('error', pipelineErrors);

    await expect(uploaderThatFailsWith(failure).upload(contents, 7)).rejects.toThrow(failure);
    await tick();

    expect(pipelineErrors).toHaveBeenCalledWith(failure);
    expect(contents.errored).toBe(failure);
  });

  it('should still destroy the source stream when the upload fails', async () => {
    contents.on('error', () => {});

    await expect(uploaderThatFailsWith(new Error('upload failed')).upload(contents, 7)).rejects.toThrow();

    expect(contents.destroyed).toBe(true);
  });

  it('should still report the failure to its own listeners', async () => {
    const failure = new Error('Request failed with status code 502');
    const fn = vi.fn().mockRejectedValue(failure) as unknown as UploadStrategyFunction;
    const sut = new EnvironmentTemporalFileUploader(fn, 'bucket');

    const reported = vi.fn<(error: Error) => void>();
    sut.on('error', reported);

    await expect(sut.upload(contents, 7)).rejects.toBe(failure);

    expect(reported).toHaveBeenCalledWith(failure);
  });
});
