import { Router } from 'express';
import { daemonReadyController } from '../controllers/daemon.controller';

export function buildDaemonRouter(): Router {
  const router = Router();

  router.post('/ready', daemonReadyController);

  return router;
}
