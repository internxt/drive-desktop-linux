import { truncateTextIfExceedsMaxLength } from './cleaner.service';

describe('cleaner-service', () => {
  describe('truncateTextIfExceedsMaxLength', () => {
    it('should return the original text when it is shorter than maxLength', () => {
      const result = truncateTextIfExceedsMaxLength('short', 30);

      expect(result).toBe('short');
    });

    it('should return the original text when it has exactly maxLength characters', () => {
      const text = 'a'.repeat(30);

      const result = truncateTextIfExceedsMaxLength(text, 30);

      expect(result).toBe(text);
    });

    it('should truncate and append ellipsis when text exceeds maxLength', () => {
      const text = 'a'.repeat(35);

      const result = truncateTextIfExceedsMaxLength(text, 30);

      expect(result).toBe('a'.repeat(30) + '...');
    });

    it('should use default maxLength of 30 when not provided', () => {
      const text = 'a'.repeat(31);

      const result = truncateTextIfExceedsMaxLength(text);

      expect(result).toBe('a'.repeat(30) + '...');
    });

    it('should return the original text when using default maxLength and text is within limit', () => {
      const text = 'a'.repeat(30);

      const result = truncateTextIfExceedsMaxLength(text);

      expect(result).toBe(text);
    });

    it('should return an empty string unchanged', () => {
      const result = truncateTextIfExceedsMaxLength('', 30);

      expect(result).toBe('');
    });
  });
});
