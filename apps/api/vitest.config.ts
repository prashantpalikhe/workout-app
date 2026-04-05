import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Lock test timezone to UTC so date-bucketing tests are deterministic
// regardless of the developer's local timezone. Must be set before Node
// caches Date's zone.
process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    // Include spec files from src/
    include: ['src/**/*.spec.ts'],
  },
  plugins: [
    // SWC plugin handles TypeScript + decorators (emitDecoratorMetadata)
    // which Vitest's default esbuild transform doesn't support.
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
