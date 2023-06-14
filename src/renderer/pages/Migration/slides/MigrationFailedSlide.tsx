import React from 'react';
import { MigrationSlideProps } from '../helpers';
import { SideTextAnimation } from 'renderer/pages/Onboarding/helpers';
import { XCircle } from 'phosphor-react';
import Button from 'renderer/components/Button';

export type MigrationFailedSlideProps = MigrationSlideProps;

export const MigrationFailedSlide: React.FC<MigrationFailedSlideProps> = (
  props
) => {
  return (
    <div className="flex h-full w-full">
      <SideTextAnimation display>
        <div className="flex w-full flex-col">
          <h1 className="mb-6 text-3xl font-semibold text-gray-100">
            {props.translate('migration.slides.migration-failed.title')}
          </h1>
          <div className="flex flex-row">
            <div className="grow-0">
              <XCircle weight="fill" className="mr-2 h-6 w-6" color="red" />
            </div>
            <div>
              <h3 className="text-lg font-medium">
                {props.translate('migration.slides.migration-failed.message')}
              </h3>
              <h4 className="font-regular mt-0.5 text-base text-gray-50">
                {props.translate(
                  'migration.slides.migration-failed.description'
                )}
              </h4>
              <Button
                variant="default"
                onClick={props.onShowFailedItems}
                className="mt-3 h-10"
              >
                {props.translate(
                  'migration.slides.migration-failed.show-files'
                )}
              </Button>
            </div>
          </div>
        </div>
      </SideTextAnimation>
    </div>
  );
};
