import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  jsx: 'automatic',
  alias: {
    'react-devtools-core': './src/shims/react-devtools-core.js'
  },
  banner: {
    js: "import { createRequire as __moyuCreateRequire } from 'node:module'; const require = __moyuCreateRequire(import.meta.url);"
  },
  outfile: 'dist/moyu.bundle.js',
  logLevel: 'info'
});
