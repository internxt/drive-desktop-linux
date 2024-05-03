import { Container } from 'diod';
import express, { Router } from 'express';
import { buildContentsController } from '../controllers/contents';

export function buildHydrationRouter(container: Container): Router {
  const controllers = buildContentsController(container);
  const router = express.Router();

  router.post('/:path', controllers.download);
  router.get('/:path', controllers.get);

  // folders
  router.get('/folders/:path', controllers.getFolder);
  router.delete('/folders/:path', controllers.removeFolder);

  // files
  router.get('/files/:path', controllers.getFile);
  router.delete('/files/:path', controllers.removeFile);

  return router;
}
