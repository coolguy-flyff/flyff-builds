import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const GENERATED_DATA_DIR = '/src/data/generated/';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  json: {
    stringify: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          let chunk: string | undefined;

          if (id.includes(GENERATED_DATA_DIR)) {
            chunk = 'game-data';
          }

          return chunk;
        },
      },
    },
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/share/**', 'src/persistence/**', 'src/state/**'],
    },
  },
});
