import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/cli.ts']
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 120000, // Longer timeout for cross-implementation tests
    hookTimeout: 120000  // Longer timeout for build processes
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});