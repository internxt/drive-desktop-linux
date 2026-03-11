import { useEffect, useState } from 'react';
import { ConfigTheme, DEFAULT_THEME, isConfigTheme } from '../../../../shared/types/Theme';
import Select, { SelectOptionsType } from '../../../components/Select';
import { useTranslationContext } from '../../../context/LocalContext';

export default function ThemePicker(): JSX.Element {
  const { translate } = useTranslationContext();
  const [selectedTheme, setSelectedTheme] = useState<ConfigTheme | null>(null);

  const themes: SelectOptionsType[] = [
    {
      value: 'system',
      name: translate('settings.general.theme.options.system'),
    },
    {
      value: 'light',
      name: translate('settings.general.theme.options.light'),
    },
    {
      value: 'dark',
      name: translate('settings.general.theme.options.dark'),
    },
  ];

  const refreshPreferedTheme = async () => {
    const theme = await window.electron.getConfigKey('preferedTheme');
    setSelectedTheme(theme ?? DEFAULT_THEME);
  };

  const updatePreferedTheme = (value: string) => {
    if (!isConfigTheme(value)) return;

    const theme = value;
    window.electron.toggleDarkMode(theme);
    window.electron.setConfigKey('preferedTheme', theme);
    refreshPreferedTheme();
  };

  useEffect(() => {
    refreshPreferedTheme();
  }, []);

  return (
    <div id="theme-picker" className="flex flex-1 flex-col items-start space-y-2">
      <p className="text-sm font-medium leading-4 text-gray-80">{translate('settings.general.theme.label')}</p>

      {selectedTheme && <Select options={themes} value={selectedTheme} onValueChange={updatePreferedTheme} />}
    </div>
  );
}
