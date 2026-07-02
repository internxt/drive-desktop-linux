import path from 'path';
import { sync as rimrafSync } from 'rimraf';
import webpackPaths from '../configs/webpack.paths';

export default function deleteSourceMaps() {
  rimrafSync(path.join(webpackPaths.distMainPath, '*.js.map'));
  rimrafSync(path.join(webpackPaths.distRendererPath, '*.js.map'));
}
