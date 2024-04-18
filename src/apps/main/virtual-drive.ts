import { HydrationApi } from '../hydration-api/HydrationApi';
if (process.platform === 'linux') {
  import('../fuse/index');
}

const hydrationApi = new HydrationApi();

hydrationApi.start({ debug: true });
