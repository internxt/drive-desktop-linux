declare module 'webpack-bundle-analyzer' {
  type BundleAnalyzerPluginOptions = Record<string, unknown>;

  export class BundleAnalyzerPlugin {
    constructor(options?: BundleAnalyzerPluginOptions);
    apply(...args: unknown[]): void;
  }
}
