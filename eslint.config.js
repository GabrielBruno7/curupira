import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'test-results/', 'playwright-report/'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
      },
    },
  },
  {
    files: ['tests/**/*.ts', 'examples/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'no-empty-pattern': 'off',
    },
  },
);
