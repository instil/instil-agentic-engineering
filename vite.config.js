import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/instil-agentic-engineering/',
  build: {
    outDir: 'dist',
  },
});
