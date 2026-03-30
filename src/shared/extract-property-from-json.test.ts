import { extractPropertyFromStringyfiedJson } from './extract-property-from-json';

describe('extractPropertyFromStringyfiedJson', () => {
  it('should return the value of an existing property', () => {
    expect(extractPropertyFromStringyfiedJson('{"retry_after": 10}', 'retry_after')).toBe(10);
  });

  it('should return undefined when the property does not exist', () => {
    expect(extractPropertyFromStringyfiedJson('{"other": 5}', 'retry_after')).toBeUndefined();
  });

  it('should return undefined when the message is not valid JSON', () => {
    expect(extractPropertyFromStringyfiedJson('not-json', 'retry_after')).toBeUndefined();
  });

  it('should return undefined for an empty string', () => {
    expect(extractPropertyFromStringyfiedJson('', 'retry_after')).toBeUndefined();
  });

  it('should return string values', () => {
    expect(extractPropertyFromStringyfiedJson('{"key": "value"}', 'key')).toBe('value');
  });

  it('should return nested objects', () => {
    expect(extractPropertyFromStringyfiedJson('{"key": {"nested": 1}}', 'key')).toStrictEqual({ nested: 1 });
  });
});
