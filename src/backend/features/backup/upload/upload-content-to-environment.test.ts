import { Environment } from '@internxt/inxt-js';
import { UploadOptions } from '@internxt/inxt-js/build/lib/core';
import { Readable } from 'stream';
import { deepMocked } from '../../../../../tests/vitest/utils.helper';
import { uploadContentToEnvironment } from './upload-content-to-environment';
import * as fs from 'node:fs';

vi.mock(import('node:fs'));

describe('upload-content-to-environment', () => {
  const createReadStreamMock = deepMocked(fs.createReadStream);

  const SMALL_SIZE = 1024;
  const LARGE_SIZE = 200 * 1024 * 1024; // > 100MB threshold

  let environment: Environment;
  let abortController: AbortController;
  let fakeStream: Readable;
  let capturedOpts: UploadOptions;

  function makeActionState() {
    return { stop: vi.fn() };
  }

  function makeUploadFn(actionState = makeActionState()) {
    return vi.fn((_bucket: string, opts: UploadOptions) => {
      capturedOpts = opts;
      return actionState;
    });
  }

  beforeEach(() => {
    abortController = new AbortController();
    fakeStream = Object.assign(new Readable({ read() {} }), { close: vi.fn(), destroy: vi.fn() });
    createReadStreamMock.mockReturnValue(fakeStream as ReturnType<typeof fs.createReadStream>);

    environment = {
      upload: makeUploadFn(),
      uploadMultipartFile: makeUploadFn(),
    } as unknown as Environment;
  });

  function callUpload(size = SMALL_SIZE) {
    return uploadContentToEnvironment({
      path: '/some/file.txt',
      size,
      bucket: 'test-bucket',
      environment,
      signal: abortController.signal,
    });
  }

  function triggerFinished(err: Error | null, contentsId: string | null) {
    capturedOpts.finishedCallback(err, contentsId);
  }

  it('should resolve with contentsId on successful upload', async () => {
    const contentsId = 'abc123';
    const promise = callUpload();
    triggerFinished(null, contentsId);

    const result = await promise;

    expect(result.data).toBe(contentsId);
    expect(result.error).toBeUndefined();
  });

  it('should use upload for files below multipart threshold', async () => {
    const promise = callUpload(SMALL_SIZE);
    triggerFinished(null, 'id');

    await promise;

    expect(environment.upload).toHaveBeenCalled();
    expect(environment.uploadMultipartFile).not.toHaveBeenCalled();
  });

  it('should use uploadMultipartFile for files above multipart threshold', async () => {
    const promise = callUpload(LARGE_SIZE);
    triggerFinished(null, 'id');

    await promise;

    expect(environment.uploadMultipartFile).toHaveBeenCalled();
    expect(environment.upload).not.toHaveBeenCalled();
  });

  it('should return NOT_ENOUGH_SPACE error when upload fails with "Max space used"', async () => {
    const promise = callUpload();
    triggerFinished(new Error('Max space used'), null);

    const result = await promise;

    expect(result.error?.cause).toBe('NOT_ENOUGH_SPACE');
  });

  it('should return RATE_LIMITED error on 429 with retry_after from message', async () => {
    const promise = callUpload();
    const err = Object.assign(new Error(JSON.stringify({ retry_after: 10 })), { status: 429 });
    triggerFinished(err, null);

    const result = await promise;

    expect(result.error?.cause).toBe('RATE_LIMITED');
    expect(result.error?.message).toBe('10000');
  });

  it('should return RATE_LIMITED with default delay when retry_after is missing', async () => {
    const promise = callUpload();
    const err = Object.assign(new Error('{}'), { status: 429 });
    triggerFinished(err, null);

    const result = await promise;

    expect(result.error?.cause).toBe('RATE_LIMITED');
    expect(result.error?.message).toBe('30000');
  });

  it('should return INTERNAL_SERVER_ERROR on 500+ errors', async () => {
    const promise = callUpload();
    const err = Object.assign(new Error('Server error'), { status: 500 });
    triggerFinished(err, null);

    const result = await promise;

    expect(result.error?.cause).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should return UNKNOWN error for generic errors', async () => {
    const promise = callUpload();
    triggerFinished(new Error('Something went wrong'), null);

    const result = await promise;

    expect(result.error?.cause).toBe('UNKNOWN');
  });

  it('should return UNKNOWN error when contentsId is null on success', async () => {
    const promise = callUpload();
    triggerFinished(null, null);

    const result = await promise;

    expect(result.error?.cause).toBe('UNKNOWN');
  });

  it('should return UNKNOWN error when createReadStream throws', async () => {
    createReadStreamMock.mockImplementation(() => {
      throw new Error('Cannot open file');
    });

    const result = await callUpload();

    expect(result.error?.cause).toBe('UNKNOWN');
  });

  it('should stop the upload and destroy the stream when signal is aborted', async () => {
    const actionState = makeActionState();
    (environment.upload as unknown as ReturnType<typeof makeUploadFn>) = makeUploadFn(actionState);

    callUpload();
    abortController.abort();

    expect(actionState.stop).toHaveBeenCalled();
    expect(fakeStream.destroy).toHaveBeenCalled();
  });
});
