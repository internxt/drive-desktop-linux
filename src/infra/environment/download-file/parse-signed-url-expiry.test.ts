import { parseSignedUrlExpiry } from './parse-signed-url-expiry';

describe('parse-signed-url-expiry', () => {
  it('should parse the Expires query param as milliseconds', () => {
    const seconds = 1788903013;

    const result = parseSignedUrlExpiry({
      url: `https://example.com/f?AWSAccessKeyId=abc&Expires=${seconds}&Signature=x`,
    });

    expect(result).toBe(seconds * 1000);
  });

  it('should return undefined when there is no Expires param', () => {
    expect(parseSignedUrlExpiry({ url: 'https://example.com/file' })).toBeUndefined();
  });

  it('should return undefined when Expires is not a number', () => {
    expect(parseSignedUrlExpiry({ url: 'https://example.com/file?Expires=soon' })).toBeUndefined();
  });

  it('should return undefined for an invalid URL', () => {
    expect(parseSignedUrlExpiry({ url: 'not-a-url' })).toBeUndefined();
  });
});
