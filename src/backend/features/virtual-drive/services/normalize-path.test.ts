import { normalizePath } from './normalize-path';

describe('normalize-path', () => {
  it.each([
    { input: '', expected: '/' },
    { input: '.', expected: '/' },
    { input: '/', expected: '/' },
    { input: 'documents/report.txt', expected: '/documents/report.txt' },
    { input: '/documents/report.txt', expected: '/documents/report.txt' },
    { input: '//documents///report.txt', expected: '/documents/report.txt' },
    { input: '/documents/./nested/../report.txt', expected: '/documents/report.txt' },
    { input: '/documents/', expected: '/documents/' },
    { input: 'documents/..', expected: '/' },
  ])('should normalize "$input" to "$expected"', ({ input, expected }) => {
    expect(normalizePath(input)).toBe(expected);
  });
});
