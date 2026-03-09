export const themes = ['system', 'light', 'dark'] as const;

export type ConfigTheme = (typeof themes)[number];

export type Theme = Exclude<ConfigTheme, 'system'>;

export type ThemeData = { configTheme: ConfigTheme; theme: Theme };

export const DEFAULT_THEME: ConfigTheme = 'system';

export function isConfigTheme(maybe: string): maybe is ConfigTheme {
  return themes.includes(maybe as ConfigTheme);
}
