/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

const isCI = !!process.env['CI'];

export default defineConfig(({ mode }) => ({
  plugins: [angular({ tsconfig: 'tsconfig.spec.json' })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    pool: 'forks',
    poolOptions: {
      forks: {
        // On the GitHub runner, several forks compiling Angular + jsdom at once
        // crashed Node ("Segmentation fault"). Run the files in a single fork
        // there; locally keep the parallel (faster) default.
        singleFork: isCI,
      },
    },
  },
  define: {
    'import.meta.vitest': mode !== 'production',
  },
}));
