import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE, Language, isLanguage } from '../../shared/Locale/Language';

export function useLanguage(): Language {
  const { i18n } = useTranslation();

  useEffect(() => {
    window.electron.getConfigKey('preferedLanguage').then((value) => {
      const lang = value;
      if (lang && isLanguage(lang) && i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    });

    const cleanup = window.electron.listenToConfigKeyChange<Language>('preferedLanguage', (lang) => {
      if (isLanguage(lang)) {
        i18n.changeLanguage(lang);
      }
    });

    return cleanup;
  }, []);

  const currentLang = i18n.language;
  return isLanguage(currentLang) ? currentLang : DEFAULT_LANGUAGE;
}
