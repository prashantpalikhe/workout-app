import { defineConfig, env } from 'prisma/config';

// Load .env for local dev; in production (Docker/Railway) env vars come from the environment.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv/config');
} catch {
  // dotenv not installed in production image — that's fine.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});
