import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { toIpcResult } from './to-ipc-result';

describe('toIpcResult', () => {
  it('passes successful results through without copying their data', () => {
    const data = { hostname: 'localhost', port: 1143 };
    const result = Result.ok(data);

    const converted = toIpcResult(result);

    expect(converted).toBe(result);
    expect(converted.data).toBe(data);
  });

  it('preserves a successful result with undefined data', () => {
    const result = Result.ok(undefined);

    expect(toIpcResult(result)).toBe(result);
    expect(Result.isError(toIpcResult(result))).toBe(false);
  });

  it('copies the name and message of a native error into a plain object', () => {
    const error = new TypeError('Invalid preference');

    const converted = toIpcResult(Result.err(error));

    expect(converted.error).toEqual({ name: 'TypeError', message: 'Invalid preference' });
    expect(Object.getPrototypeOf(converted.error)).toBe(Object.prototype);
    expect(converted.error).not.toBeInstanceOf(Error);
  });

  it('preserves enumerable custom error fields through structured cloning', () => {
    class PreparationError extends Error {
      readonly code = 'mail-not-setup';
      readonly details = { status: 404 };
    }
    const error = new PreparationError('Create a mailbox first');

    const cloned = structuredClone(toIpcResult(Result.err(error)));

    expect(cloned.error).toEqual({
      name: 'Error',
      message: 'Create a mailbox first',
      code: 'mail-not-setup',
      details: { status: 404 },
    });
  });

  it('does not mutate the original error or result', () => {
    const error = Object.freeze(Object.assign(new Error('Could not start'), { code: 'start-failed' }));
    const result = Object.freeze(Result.err(error));
    const descriptors = Object.getOwnPropertyDescriptors(error);

    const converted = toIpcResult(result);

    expect(converted).not.toBe(result);
    expect(converted.error).not.toBe(error);
    expect(result.error).toBe(error);
    expect(Object.getOwnPropertyDescriptors(error)).toEqual(descriptors);
  });
});
