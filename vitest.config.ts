import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/types.ts',
        'dist/**',
        'examples/**',
        'website/**',
        'node_modules/**',
      ],
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
      // Allow some tolerance for strict 100% requirement
      watermarks: {
        lines: [95, 100],
        functions: [95, 100],
        branches: [95, 100],
        statements: [95, 100],
      },
    },
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'examples', 'website'],
  },
})
