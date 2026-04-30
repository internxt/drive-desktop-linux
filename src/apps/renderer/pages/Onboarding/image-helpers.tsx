import { OnboardingImages } from '../types';
import { Language } from '../../../shared/Locale/Language';

import CleanerLightImageSpanish from '../../assets/onboarding/cleaner/ES-Light.svg';
import CleanerLightImageFrench from '../../assets/onboarding/cleaner/FR-Light.svg';
import CleanerLightImageEnglish from '../../assets/onboarding/cleaner/EN-Light.svg';
import CleanerDarkImageSpanish from '../../assets/onboarding/cleaner/ES-Dark.svg';
import CleanerDarkImageFrench from '../../assets/onboarding/cleaner/FR-Dark.svg';
import CleanerDarkImageEnglish from '../../assets/onboarding/cleaner/EN-Dark.svg';

import DriveLightImageSpanish from '../../assets/onboarding/drive/ES-Light.svg';
import DriveLightImageFrench from '../../assets/onboarding/drive/FR-Light.svg';
import DriveLightImageEnglish from '../../assets/onboarding/drive/EN-Light.svg';
import DriveDarkImageSpanish from '../../assets/onboarding/drive/ES-Dark.svg';
import DriveDarkImageFrench from '../../assets/onboarding/drive/FR-Dark.svg';
import DriveDarkImageEnglish from '../../assets/onboarding/drive/EN-Dark.svg';

import AntivirusLightImageSpanish from '../../assets/onboarding/antivirus/ES-Light.svg';
import AntivirusLightImageFrench from '../../assets/onboarding/antivirus/FR-Light.svg';
import AntivirusLightImageEnglish from '../../assets/onboarding/antivirus/EN-Light.svg';
import AntivirusDarkImageSpanish from '../../assets/onboarding/antivirus/ES-Dark.svg';
import AntivirusDarkImageFrench from '../../assets/onboarding/antivirus/FR-Dark.svg';
import AntivirusDarkImageEnglish from '../../assets/onboarding/antivirus/EN-Dark.svg';

import FileExplorerLightImage from '../../assets/onboarding/finder/linux-light.svg';
import FileExplorerDarkImage from '../../assets/onboarding/finder/linux-dark.svg';

import BackupsLightSvg from '../../assets/onboarding/backups/backups-light.svg';
import BackupsDarkSvg from '../../assets/onboarding/backups/backups-dark.svg';

type ClearTheme = 'light' | 'dark';

export function getLinuxFileExplorerImage(theme: ClearTheme) {
  const FileExplorer = theme === 'light' ? FileExplorerLightImage : FileExplorerDarkImage;
  return <FileExplorer />;
}

export const getCleanerImageSvg = (language: Language, theme: ClearTheme) => {
  const images: OnboardingImages = {
    es: {
      light: CleanerLightImageSpanish,
      dark: CleanerDarkImageSpanish,
    },
    fr: {
      light: CleanerLightImageFrench,
      dark: CleanerDarkImageFrench,
    },
    en: {
      light: CleanerLightImageEnglish,
      dark: CleanerDarkImageEnglish,
    },
  };

  const lang = images[language] || images.en;
  return lang[theme];
};

export const getDriveImageSvg = (language: Language, theme: ClearTheme) => {
  const images: OnboardingImages = {
    es: {
      light: DriveLightImageSpanish,
      dark: DriveDarkImageSpanish,
    },
    fr: {
      light: DriveLightImageFrench,
      dark: DriveDarkImageFrench,
    },
    en: {
      light: DriveLightImageEnglish,
      dark: DriveDarkImageEnglish,
    },
  };

  const lang = images[language] || images.en;
  return lang[theme];
};

export const getAntivirusImageSvg = (language: Language, theme: ClearTheme) => {
  const images: OnboardingImages = {
    es: {
      light: AntivirusLightImageSpanish,
      dark: AntivirusDarkImageSpanish,
    },
    fr: {
      light: AntivirusLightImageFrench,
      dark: AntivirusDarkImageFrench,
    },
    en: {
      light: AntivirusLightImageEnglish,
      dark: AntivirusDarkImageEnglish,
    },
  };

  const lang = images[language] || images.en;
  return lang[theme];
};

export const getBackupsImageSvg = (theme: ClearTheme) => {
  const BackupsImage = theme === 'light' ? BackupsLightSvg : BackupsDarkSvg;
  return <BackupsImage />;
};
