import { createTemporalFileUploadQueueState } from './state';
import type { FactoryProps } from './types';
import { enqueueUpload } from './enqueue-upload';

export function createTemporalFileUploadQueueService(props: FactoryProps) {
  const state = createTemporalFileUploadQueueState();

  return {
    enqueue: enqueueUpload.bind(null, {
      ...props,
      state,
    }),
  };
}
