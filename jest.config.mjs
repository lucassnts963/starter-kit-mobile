/**
 * Dois projetos de teste (arquivos separados para os presets resolverem corretamente):
 *  - node: ts-jest — domínio/serviços/repositories/adapters (SQLite real via node:sqlite)
 *  - ui:   jest-expo — componentes apresentacionais React Native (RTL)
 * Rotas em app/ e adapters nativos em src/expo/ são passthrough fino sobre APIs do Expo —
 * validados nos spikes em aparelho (CHG-002 Notes), fora do coverage de CI.
 */
export default {
  projects: ['<rootDir>/jest.node.config.mjs', '<rootDir>/jest.ui.config.mjs'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/expo/**',
  ],
  coverageThreshold: {
    // threshold: .specs/config.md## Defaults
    global: { branches: 90, functions: 90, lines: 90, statements: 90 },
  },
};
