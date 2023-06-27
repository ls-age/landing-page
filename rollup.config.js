import { join } from 'path';
import { builtinModules } from 'module';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import svelte from 'rollup-plugin-svelte';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import { sass } from 'svelte-preprocess-sass';
import config from 'sapper/config/rollup.js';
import pkg from './package.json';

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const legacy = !!process.env.SAPPER_LEGACY_BUILD;

const svelteOptions = {
  dev,
  preprocess: {
    style: sass({
      includePaths: [join(__dirname, 'node_modules')],
      quietDeps: true,
    }),
  },
};

if (dev) {
  try {
    // eslint-disable-next-line global-require,import/no-unresolved
    const result = require('dotenv').config();

    if (result.error) throw result.error;
    // eslint-disable-next-line no-console
    console.log(`> Loaded from .env file:
  ${Object.entries(result.parsed)
    .map(([key, value]) => `${key}: ${value.slice(0, 10)}...`)
    .join('\n  ')}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`> No .env file processed:
  ${error.message}`);
  }
}

export default {
  client: {
    input: config.client.input(),
    output: config.client.output(),
    plugins: [
      replace({
        'process.browser': true,
        'process.env.NODE_ENV': JSON.stringify(mode),
      }),
      svelte({
        ...svelteOptions,
        hydratable: true,
        emitCss: true,
        skipIntroByDefault: true,
        nestedTransitions: true,
      }),
      resolve(),
      commonjs(),

      legacy &&
        babel({
          extensions: ['.js', '.html'],
          runtimeHelpers: true,
          exclude: ['node_modules/@babel/**'],
          presets: [
            [
              '@babel/preset-env',
              {
                targets: '> 0.25%, not dead',
              },
            ],
          ],
          plugins: [
            '@babel/plugin-syntax-dynamic-import',
            [
              '@babel/plugin-transform-runtime',
              {
                useESModules: true,
              },
            ],
          ],
        }),

      !dev &&
        terser({
          module: true,
        }),
    ],
  },

  server: {
    input: config.server.input(),
    output: config.server.output(),
    plugins: [
      replace({
        'process.browser': false,
        'process.env.NODE_ENV': JSON.stringify(mode),
      }),
      svelte({
        ...svelteOptions,
        generate: 'ssr',
      }),
      resolve(),
      commonjs(),
    ],
    external: Object.keys(pkg.dependencies).concat(builtinModules),
  },

  serviceworker: {
    input: config.serviceworker.input(),
    output: config.serviceworker.output(),
    plugins: [
      resolve(),
      replace({
        'process.browser': true,
        'process.env.NODE_ENV': JSON.stringify(mode),
      }),
      commonjs(),
      !dev && terser(),
    ],
  },
};
