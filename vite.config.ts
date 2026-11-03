import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'docs',
    emptyOutDir: false,
    target: 'es2022',
    rollupOptions: {
      input: 'src/main.ts',
      external: ['three', /^three\/.*/],
      output: {
        entryFileNames: 'bundle.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});