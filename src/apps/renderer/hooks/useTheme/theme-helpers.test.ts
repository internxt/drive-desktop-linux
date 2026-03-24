import { applyThemeClass, resolveTheme } from './theme-helpers';

describe('theme-helpers', () => {
  describe('applyThemeClass', () => {
    beforeEach(() => {
      document.documentElement.classList.remove('dark');
    });

    it('should add "dark" class when theme is dark', () => {
      applyThemeClass('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove "dark" class when theme is light', () => {
      document.documentElement.classList.add('dark');
      applyThemeClass('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('resolveTheme', () => {
    it('should return "light" when config is "light"', () => {
      expect(resolveTheme('light')).toBe('light');
    });

    it('should return "dark" when config is "dark"', () => {
      expect(resolveTheme('dark')).toBe('dark');
    });

    it('should resolve to "light" when config is "system" and prefers-color-scheme is light', () => {
      expect(resolveTheme('system')).toBe('light');
    });
  });
});
