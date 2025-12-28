import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'plugins/index': 'src/plugins/index.ts',
    'sw/index': 'src/sw/index.ts',
    'react/index': 'src/adapters/react/index.ts',
    'vue/index': 'src/adapters/vue/index.ts',
    'svelte/index': 'src/adapters/svelte/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  minify: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'vue', 'svelte'],
  // Don't bundle peer dependencies
  noExternal: [],
})
