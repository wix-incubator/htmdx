import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['typescript', 'unicorn', 'import'],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },
  env: {
    browser: true,
  },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    'no-prototype-builtins': 'off',
    'typescript/no-non-null-asserted-optional-chain': 'off',
    'typescript/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
    'typescript/no-inferrable-types': 'off',
    'no-console': 'warn',
  },
});
