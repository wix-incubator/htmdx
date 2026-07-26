import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['typescript', 'unicorn', 'import'],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },
  env: {
    node: true,
  },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    'typescript/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
    'typescript/no-inferrable-types': 'off',
    'no-console': 'warn',
  },
});
