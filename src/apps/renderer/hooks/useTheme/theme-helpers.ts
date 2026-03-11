import { ConfigTheme, Theme } from '../../../shared/types/Theme';

export function applyThemeClass(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function resolveTheme(configTheme: ConfigTheme): Theme {
  if (configTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return configTheme;
}
