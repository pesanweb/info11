// @ts-nocheck
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';
import esbuild from 'rollup-plugin-esbuild';

const inputFile = "src/custom.js";
export default {
  input : inputFile,
  output: {
    file: `build/custom.es6.js`,
    format: 'es',
    sourcemap: false,
  },
  preserveEntrySignatures: false,
  plugins: [
    /** Resolve bare module imports */
    nodeResolve(),
    /** Minify JS, compile JS to a lower language target */
    esbuild({
      minify: true,
      target: ['chrome64', 'firefox67', 'safari11.1'],
    }),
    /** Bundle assets references via import.meta.url */
    importMetaAssets(),
    /** Minify html and css tagged template literals */
    babel({
      babelHelpers: 'bundled',
    }),
  ],
};