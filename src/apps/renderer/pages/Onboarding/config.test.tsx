import { SLIDES } from './config';

// Mock the translation context
vi.mock('../../context/LocalContext', () => ({
  useTranslationContext: () => ({
    translate: (key: string) => key,
    language: 'en',
  }),
}));

describe('Onboarding Config', () => {
  describe('SLIDES', () => {
    it('contains all required slides in correct order', () => {
      const slideNames = SLIDES.map((slide) => slide.name);
      expect(slideNames).toEqual([
        'Welcome Slide',
        'Drive Slide',
        'Backups Slide',
        'Antivirus Slide',
        'Cleaner Slide',
        'Onboarding Completed',
      ]);
    });

    it('each slide has required properties', () => {
      SLIDES.forEach((slide) => {
        expect(slide).toHaveProperty('name');
        expect(slide).toHaveProperty('component');
        expect(slide).toHaveProperty('footer');
        expect(slide).toHaveProperty('image');
      });
    });
  });
});
