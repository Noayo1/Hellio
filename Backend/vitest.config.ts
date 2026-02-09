import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env file
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    sequence: {
      shuffle: false,
    },
    fileParallelism: false,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
