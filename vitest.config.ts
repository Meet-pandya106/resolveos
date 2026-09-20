import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000
  },
  resolve: {
    alias: {
      '@resolveos/shared': path.resolve(__dirname, './packages/shared/src'),
      '@resolveos/domain': path.resolve(__dirname, './packages/domain/src'),
      '@resolveos/validation': path.resolve(__dirname, './packages/validation/src'),
      '@resolveos/security': path.resolve(__dirname, './packages/security/src'),
      '@resolveos/database': path.resolve(__dirname, './packages/database/src')
    }
  }
});
