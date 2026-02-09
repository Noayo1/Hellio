import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env file from project root
config({ path: join(__dirname, '..', '.env') });

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
