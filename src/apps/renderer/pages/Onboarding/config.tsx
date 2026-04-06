import { OnboardingSlide, SideImageAnimation, SideTextAnimation } from './helpers';

import { OnboardingCompletedSlide } from './slides/onboarding-completed-slide';
import { BackupsSlide } from './slides/backups-slide';
import { AntivirusSlide } from './slides/antivirus-slide';
import { WelcomeSlide } from './slides/welcome-slide';
import { DriveSlide } from './slides/drive-slide';
import { CleanerSlide } from './slides/cleaner-slide';
import Button from '../../components/Button';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useTranslationContext } from '../../context/LocalContext';
import {
  getDriveImageSvg,
  getAntivirusImageSvg,
  getCleanerImageSvg,
  getLinuxFileExplorerImage,
  getBackupsImageSvg,
} from './image-helpers';

export const SLIDES: OnboardingSlide[] = [
  {
    name: 'Welcome Slide',
    component: (props) => {
      return (
        <div className="flex h-full w-full">
          <SideTextAnimation display>
            <WelcomeSlide {...props} />
          </SideTextAnimation>
        </div>
      );
    },
    footer: (props) => {
      const { translate } = useTranslationContext();
      return (
        <div className="flex w-full flex-1 items-end space-x-2">
          <Button onClick={props.onGoNextSlide} variant="primary" size="lg">
            {translate('onboarding.slides.welcome.take-tour')}
          </Button>
          <Button onClick={props.onSkipOnboarding} variant="outline" size="lg">
            {translate('onboarding.common.skip')}
          </Button>
        </div>
      );
    },
    image: () => {
      const { theme } = useTheme();
      return (
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute top-[80px] left-[76px]">
            {getLinuxFileExplorerImage(theme)}
          </div>
        </div>
      );
    },
  },
  {
    name: 'Drive Slide',
    component: (props) => {
      return (
        <div className="flex h-full w-full">
          <SideTextAnimation display>
            <DriveSlide {...props} />
          </SideTextAnimation>
        </div>
      );
    },
    footer: (props) => {
      const { translate } = useTranslationContext();
      return (
        <div className="flex w-full flex-1 items-end justify-center">
          <Button onClick={props.onGoNextSlide} variant="primary" size="lg">
            {translate('onboarding.common.continue')}
          </Button>
          <span className="ml-auto text-gray-50">
            {translate('onboarding.common.onboarding-progress', {
              current_slide: props.currentSlide,
              total_slides: props.totalSlides,
            })}
          </span>
        </div>
      );
    },
    image: () => {
      const DriveImage = () => {
        const language = useLanguage();
        const { theme } = useTheme();
        const DriveImage = getDriveImageSvg(language, theme);
        if (!DriveImage) return null;

        return <DriveImage />;
      };
      return (
        <div className="relative ml-20 mt-20">
          <DriveImage />
        </div>
      );
    },
  },
  {
    name: 'Backups Slide',
    component: (props) => {
      return (
        <div className="flex h-full w-full">
          <SideTextAnimation display>
            <BackupsSlide {...props} />
          </SideTextAnimation>
        </div>
      );
    },
    footer: (props) => {
      const { translate } = useTranslationContext();
      return (
        <div className="flex w-full flex-1 items-end justify-center">
          <Button onClick={props.onGoNextSlide} variant="primary" size="lg">
            {translate('onboarding.common.continue')}
          </Button>
          <span className="ml-auto text-gray-50">
            {translate('onboarding.common.onboarding-progress', {
              current_slide: props.currentSlide,
              total_slides: props.totalSlides,
            })}
          </span>
        </div>
      );
    },
    image: () => {
      const { theme } = useTheme();
      return (
        <div className="grid h-full w-full place-items-center [&>svg]:translate-x-4">{getBackupsImageSvg(theme)}</div>
      );
    },
  },
  {
    name: 'Antivirus Slide',
    component: (props) => {
      return (
        <div className="flex h-full w-full">
          <SideTextAnimation display>
            <AntivirusSlide {...props} />
          </SideTextAnimation>
        </div>
      );
    },
    footer: (props) => {
      const { translate } = useTranslationContext();
      return (
        <div className="flex w-full flex-1 items-end justify-center">
          <Button onClick={props.onGoNextSlide} variant="primary" size="lg">
            {translate('onboarding.common.continue')}
          </Button>
          <span className="ml-auto text-gray-50">
            {translate('onboarding.common.onboarding-progress', {
              current_slide: props.currentSlide,
              total_slides: props.totalSlides,
            })}
          </span>
        </div>
      );
    },
    image: () => {
      const AntivirusImage = () => {
        const language = useLanguage();
        const { theme } = useTheme();
        const AntivirusImage = getAntivirusImageSvg(language, theme);
        if (!AntivirusImage) return null;

        return <AntivirusImage />;
      };

      return (
        <div className="flex h-full w-full items-center justify-center">
          <AntivirusImage />
        </div>
      );
    },
  },
  {
    name: 'Cleaner Slide',
    component: () => {
      return (
        <div className="flex h-full w-full">
          <SideTextAnimation display>
            <CleanerSlide />
          </SideTextAnimation>
        </div>
      );
    },
    footer: (props) => {
      const { translate } = useTranslationContext();
      return (
        <div className="flex w-full flex-1 items-end justify-center">
          <Button onClick={props.onGoNextSlide} variant="primary" size="lg">
            {translate('onboarding.common.continue')}
          </Button>
          <span className="ml-auto text-gray-50">
            {translate('onboarding.common.onboarding-progress', {
              current_slide: props.currentSlide,
              total_slides: props.totalSlides,
            })}
          </span>
        </div>
      );
    },
    image: () => {
      const CleanerImage = () => {
        const language = useLanguage();
        const { theme } = useTheme();
        const CleanerImage = getCleanerImageSvg(language, theme);
        if (!CleanerImage) return null;

        return <CleanerImage />;
      };

      return (
        <div className="relative flex h-full w-full items-center justify-center">
          <SideImageAnimation display>
            <CleanerImage />
          </SideImageAnimation>
        </div>
      );
    },
  },
  {
    name: 'Onboarding Completed',
    component: (props) => {
      return (
        <div className="flex h-full w-full">
          <SideTextAnimation display>
            <OnboardingCompletedSlide {...props} />
          </SideTextAnimation>
        </div>
      );
    },
    footer: (props) => {
      const { translate } = useTranslationContext();
      return (
        <div className="flex w-full flex-1 items-end">
          <Button onClick={props.onFinish} variant="primary" size="lg">
            {translate('onboarding.common.open-drive')}
          </Button>
        </div>
      );
    },
    image: () => {
      const { theme } = useTheme();
      return (
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute left-[76px] top-[80px]">
            <SideImageAnimation display>{getLinuxFileExplorerImage(theme)}</SideImageAnimation>
          </div>
        </div>
      );
    },
  },
];
