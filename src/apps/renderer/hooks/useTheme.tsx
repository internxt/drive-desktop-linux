import { useEffect, useState } from 'react';
import { ConfigTheme, Theme, ThemeData } from '../../shared/types/Theme';

function applyThemeClass(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const updateTheme = (newTheme: Theme) => {
      setTheme(newTheme);
      applyThemeClass(newTheme);
    };

    const resolveTheme = (configTheme: ConfigTheme) => {
      if (configTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        updateTheme(prefersDark ? 'dark' : 'light');
      } else {
        updateTheme(configTheme);
      }
    };

    window.electron.getConfigKey('preferedTheme').then((value) => {
      resolveTheme(value ?? 'system');
    });

    const unsubscribe = window.electron.listenToConfigKeyChange<ThemeData | ConfigTheme>('preferedTheme', (value) => {
      if (typeof value === 'object' && value !== null && 'theme' in value) {
        updateTheme(value.theme);
      } else {
        resolveTheme((value as ConfigTheme) ?? 'system');
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
