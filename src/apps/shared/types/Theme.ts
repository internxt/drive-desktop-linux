export const themes = ['system', 'light', 'dark'] as const;

/** All selectable theme values including 'system' */
export type ConfigTheme = (typeof themes)[number];

/** Resolved (applied) theme — never 'system' */
export type Theme = Exclude<ConfigTheme, 'system'>;

export type ThemeData = { configTheme: ConfigTheme; theme: Theme };

export const DEFAULT_THEME: ConfigTheme = 'system';
