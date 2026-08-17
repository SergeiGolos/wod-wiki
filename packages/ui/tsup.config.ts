import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/extensions.ts'],
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
    '@wod-wiki/lang',
    '@wod-wiki/wql',
    'react',
    'react-dom',
    'recharts',
    'lucide-react',
    '@codemirror/autocomplete',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr'
  ]
});
