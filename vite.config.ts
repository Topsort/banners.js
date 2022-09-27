import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      format: ['es']
    },
    rollupOptions: {
      external: /^lit/
    }
  }
})
