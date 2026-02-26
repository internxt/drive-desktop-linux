import { useEffect, useState } from 'react';
import { ConfigTheme, DEFAULT_THEME } from '../../../../shared/types/Theme';
import Select, { SelectOptionsType } from '../../../components/Select';
import { useTranslationContext } from '../../../context/LocalContext';
import useConfig from '../../../hooks/useConfig';

export default function ThemePicker(): JSX.Element {
  const { translate } = useTranslationContext();
  const [selectedTheme, setSelectedTheme] = useState<ConfigTheme | null>((useConfig('preferedTheme') as ConfigTheme) || null);

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
    if (!theme) {
      setSelectedTheme(DEFAULT_THEME);
    } else {
      setSelectedTheme(theme as ConfigTheme);
    }
  };

  const updatePreferedTheme = (theme: string) => {
    window.electron.toggleDarkMode(theme as ConfigTheme);
    window.electron.setConfigKey('preferedTheme', theme as ConfigTheme);
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
