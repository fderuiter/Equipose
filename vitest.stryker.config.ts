import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.ts';

export default mergeConfig(baseConfig, {
  test: {
    environment: 'node',
    setupFiles: [],
    include: ['src/app/domain/randomization-engine/core/**/*.spec.ts'],
    exclude: ['src/app/domain/randomization-engine/core/randomization-algorithm-golden.spec.ts', 'tests_e2e/**', 'stryker-tmp/**', 'node_modules/**', 'dist/**'],
  },
});
