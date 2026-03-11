import { describe, it, expect } from 'vitest';
import { isError } from './is-error';

describe('isError', () => {
  it('should return true for an Error instance', () => {
    expect(isError(new Error('test'))).toBe(true);
  });

  it('should return true for an Error subclass', () => {
    expect(isError(new TypeError('test'))).toBe(true);
  });

  it('should return false for a string', () => {
    expect(isError('error')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isError(undefined)).toBe(false);
  });

  it('should return false for a plain object with a message property', () => {
    expect(isError({ message: 'test' })).toBe(false);
  });
});
