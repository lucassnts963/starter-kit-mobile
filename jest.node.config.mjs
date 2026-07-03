/** Projeto "node": domínio/serviços/repositories/adapters — ts-jest + SQLite real (node:sqlite). */
export default {
  displayName: 'node',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/components/'],
};
