/**
 * Fatia A (domínio puro) roda em Node. Quando o scaffold Expo entrar (Fatias D/E),
 * este config vira multi-project com o preset jest-expo para src/services e app/.
 */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts'],
  coverageThreshold: {
    // threshold: .specs/config.md## Defaults
    global: { branches: 90, functions: 90, lines: 90, statements: 90 },
  },
};
