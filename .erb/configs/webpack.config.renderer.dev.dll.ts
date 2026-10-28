/**
 * Builds the DLL for development electron renderer process
 */

import webpack from 'webpack';
import path from 'path';
import { merge } from 'webpack-merge';
import baseConfig from './webpack.config.base.ts';
import webpackPaths from './webpack.paths.ts';
import { dependencies } from '../../package.json';
import checkNodeEnv from '../scripts/check-node-env.js';

checkNodeEnv('development');

const dist = webpackPaths.dllPath;

/**
 * Main-process packages. Their transitive deps stay nested under
 * node_modules/<package>/node_modules, and this DLL build only resolves the
 * top-level node_modules directory. typeorm's browser build requires "buffer/".
 */
const mainProcessOnlyDependencies = ['electron-updater', 'archiver', 'typeorm'];

function isRendererDependency(dependency: string) {
  return !mainProcessOnlyDependencies.includes(dependency);
}

const rendererDependencies = Object.keys(dependencies || {}).filter(isRendererDependency);

const configuration: webpack.Configuration = {
  context: webpackPaths.rootPath,

  devtool: 'eval',

  mode: 'development',

  target: 'electron-renderer',

  externals: ['fsevents', 'crypto-browserify', '@internxt/drive-desktop-core'],

  /**
   * Use `module` from `webpack.config.renderer.dev.js`
   */
  module: require('./webpack.config.renderer.dev').default.module,

  entry: {
    renderer: rendererDependencies,
  },

  output: {
    path: dist,
    filename: '[name].dev.dll.js',
    library: {
      name: 'renderer',
      type: 'var',
    },
  },

  plugins: [
    new webpack.DllPlugin({
      path: path.join(dist, '[name].json'),
      name: '[name]',
    }),

    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    }),

    new webpack.LoaderOptionsPlugin({
      debug: true,
      options: {
        context: webpackPaths.srcPath,
        output: {
          path: webpackPaths.dllPath,
        },
      },
    }),
  ],
};

export default merge(baseConfig, configuration);
