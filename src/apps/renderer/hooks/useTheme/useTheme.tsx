import { useEffect, useState } from 'react';
import { ConfigTheme, Theme, ThemeData } from '../../../shared/types/Theme';
import { applyThemeClass, resolveTheme } from './theme-helpers';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  function updateTheme(newTheme: Theme) {
    setTheme(newTheme);
    applyThemeClass(newTheme);
  }

  useEffect(() => {
    window.electron.getConfigKey('preferedTheme').then((value) => {
      updateTheme(resolveTheme(value ?? 'system'));
    });

    const unsubscribe = window.electron.listenToConfigKeyChange<ThemeData | ConfigTheme>('preferedTheme', (value) => {
      if (typeof value === 'object' && value !== null && 'theme' in value) {
        updateTheme(value.theme);
      } else {
        updateTheme(resolveTheme((value as ConfigTheme) ?? 'system'));
      }
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      window.electron.getConfigKey('preferedTheme').then((value) => {
        if (!value || value === 'system') {
          updateTheme(mediaQuery.matches ? 'dark' : 'light');
        }
      });
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      unsubscribe();
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  return { theme };
}
