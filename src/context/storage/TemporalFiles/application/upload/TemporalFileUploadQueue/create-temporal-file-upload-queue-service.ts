import { createTemporalFileUploadQueueState } from './state';
import type { EnqueueProps, FactoryProps } from './types';
import { enqueueUpload } from './enqueue-upload';

export function createTemporalFileUploadQueueService(props: FactoryProps) {
  const state = createTemporalFileUploadQueueState();

  async function enqueue(enqueueProps: EnqueueProps) {
    return enqueueUpload({
      ...props,
      state,
      ...enqueueProps,
    });
  }

  return {
    enqueue,
  };
}
