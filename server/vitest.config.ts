import { defineConfig } from 'vitest/config';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'fs';

// Load .env.test BEFORE vitest spawns workers so DATABASE_URL etc. are set
// when shared/db.ts instantiates the Prisma client.
if (existsSync('.env.test')) {
  loadDotenv({ path: '.env.test' });
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.types.ts'],
    },
  },
});
