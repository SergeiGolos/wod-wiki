import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/react.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
  treeshake: true,
  target: 'es2022',
  external: [
    '@wod-wiki/core',
    'react',
    'react-dom',
    '@codemirror/state',
    '@codemirror/language',
    '@codemirror/autocomplete',
    '@lezer/common',
    '@lezer/lr'
  ]
});
