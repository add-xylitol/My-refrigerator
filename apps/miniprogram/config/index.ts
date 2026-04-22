const path = require('path')

const config = {
  projectName: 'smart-fridge',
  date: '2026-4-10',
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 375: 2, 828: 1.81 / 2 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-platform-h5'],
  defineConstants: {
    'process.env.API_BASE_URL': JSON.stringify('https://smart-fridge-247510-5-1423032080.sh.run.tcloudbase.com'),
  },
  copy: {
    patterns: [
      { from: 'src/sitemap.json', to: 'dist/sitemap.json' },
    ],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: { enable: false },
  sass: { data: '@import "@/styles/variables.scss";' },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  mini: {
    postcss: { pxtransform: { enable: true, config: {} } },
    webpackChain(chain) {
      chain.resolve.alias
        .set('@smart-fridge/shared', path.resolve(__dirname, '..', 'src', 'utils', 'shared-stub.ts'))
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    devServer: { port: 10086, hot: true, open: true },
    router: { mode: 'browser' },
  },
}

module.exports = config
