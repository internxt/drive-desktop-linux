import { describe, it, expect } from 'vitest';
import { isError } from './is-error';

describe('isError', () => {
  it('returns true for an Error instance', () => {
    expect(isError(new Error('test'))).toBe(true);
  });

  it('returns true for an Error subclass', () => {
    expect(isError(new TypeError('test'))).toBe(true);
  });

  it('returns false for a string', () => {
    expect(isError('error')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isError(undefined)).toBe(false);
  });

  it('returns false for a plain object with a message property', () => {
    expect(isError({ message: 'test' })).toBe(false);
  });
});
